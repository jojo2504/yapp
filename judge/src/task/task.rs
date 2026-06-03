use std::time::{Duration, Instant};

use crate::{
    docker::DockerClient,
    models::{InlineTestCase, Language, Submission, Verdict},
    request::{ChallengeJudgeOutput, ChallengeTestResult, JudgeResultRequest, ReqwestClient, TestResultDTO},
};
use colored::Colorize;

const DEFAULT_TIME_LIMIT: Duration = Duration::from_millis(2000);
const COMPILE_TIMEOUT: Duration = Duration::from_secs(30);

/// Entry point: judge a submission, then report the verdict back to the backend.
/// The container is always cleaned up, even on error.
pub async fn process_submission(
    docker_client: &mut DockerClient,
    reqwest_client: &ReqwestClient,
    submission: &Submission,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let container_name =
        str::to_lowercase(&format!("{}_sandbox_{}", submission.language, submission.id));

    let judge_result = run_judge(docker_client, reqwest_client, submission, &container_name).await;

    // Always clean up the container.
    let _ = docker_client.delete_container(&container_name).await;

    let result_to_send = match judge_result {
        Ok(r) => r,
        Err(e) => {
            eprintln!(
                "{} judging submission {}: {}",
                "Error".red(),
                submission.id,
                e
            );
            JudgeResultRequest {
                submission_id: submission.id as i64,
                verdict: Verdict::InternalError,
                message: Some(e.to_string()),
                execution_time: None,
                memory_usage: None,
                judge_output: None,
                test_results: vec![],
            }
        }
    };

    if let Err(e) = reqwest_client.send_result(&result_to_send).await {
        eprintln!(
            "{} sending result for submission {}: {}",
            "Error".red(),
            submission.id,
            e
        );
    }

    Ok(())
}

/// Core judging logic (container lifecycle handled by the caller).
async fn run_judge(
    docker_client: &mut DockerClient,
    reqwest_client: &ReqwestClient,
    submission: &Submission,
    container_name: &str,
) -> Result<JudgeResultRequest, Box<dyn std::error::Error + Send + Sync>> {
    // 1. Spin up the sandbox container.
    docker_client.create_container(container_name, submission).await?;
    docker_client.start_container(container_name).await?;

    let is_challenge = submission
        .inline_test_cases
        .as_ref()
        .map_or(false, |v| !v.is_empty());

    // For challenge submissions the student source alone may not be a complete
    // program (e.g. C++ without main, Java with no public class). We skip the
    // standalone prepare + compile and let run_challenge build a combined
    // source per test case.
    if !is_challenge {
        docker_client.prepare_file(container_name, submission).await?;

        if submission.language.is_compiled() {
            let build_cmd = submission
                .language
                .build_command()
                .expect("is_compiled() is true but build_command() returned None");

            let build_output = docker_client
                .run_command(
                    container_name,
                    vec!["bash".into(), "-c".into(), build_cmd],
                    Some(COMPILE_TIMEOUT),
                )
                .await;

            match build_output {
                Err(e) => {
                    return Ok(JudgeResultRequest {
                        submission_id: submission.id as i64,
                        verdict: Verdict::CompilationError,
                        message: Some(e.to_string()),
                        execution_time: None,
                        memory_usage: None,
                        judge_output: None,
                        test_results: vec![],
                    });
                }
                Ok(out) if out.exit_code != Some(0) => {
                    let stderr = out.stderr_buf.map(|v| v.join(""));
                    return Ok(JudgeResultRequest {
                        submission_id: submission.id as i64,
                        verdict: Verdict::CompilationError,
                        message: stderr.clone(),
                        execution_time: None,
                        memory_usage: None,
                        judge_output: stderr,
                        test_results: vec![],
                    });
                }
                Ok(_) => {}
            }
        }
    }

    // 3. Playground run (problem_id == 0, no inline test cases): execute once.
    if submission.problem_id == 0 && !is_challenge {
        // Inject stdin if provided.
        if let Some(ref stdin) = submission.stdin {
            if !stdin.is_empty() {
                docker_client.inject_stdin(container_name, stdin).await?;
            }
        }

        let run_cmd = if submission.stdin.as_deref().map(|s| !s.is_empty()).unwrap_or(false) {
            format!("{} < /tmp/stdin", submission.language.run_command())
        } else {
            submission.language.run_command()
        };

        let out = docker_client
            .run_command(
                container_name,
                vec!["bash".into(), "-c".into(), run_cmd],
                Some(DEFAULT_TIME_LIMIT),
            )
            .await?;

        let verdict = if out.exit_code == Some(0) {
            Verdict::Accepted
        } else {
            Verdict::RuntimeError
        };
        let stdout = out.stdout_buf.map(|v| v.join(""));
        let stderr = out.stderr_buf.map(|v| v.join(""));

        return Ok(JudgeResultRequest {
            submission_id: submission.id as i64,
            verdict,
            message: stderr,
            execution_time: None,
            memory_usage: None,
            judge_output: stdout,
            test_results: vec![],
        });
    }

    // 4. Challenge run: inline test cases embedded in the submission message.
    if let Some(ref inline_tcs) = submission.inline_test_cases {
        if !inline_tcs.is_empty() {
            return run_challenge(docker_client, submission, container_name, inline_tcs).await;
        }
    }

    // 5. Problem run: fetch test cases from the backend.
    let test_cases = reqwest_client
        .fetch_test_cases(submission.problem_id)
        .await?;

    if test_cases.is_empty() {
        // No test cases → trivially accepted.
        return Ok(JudgeResultRequest {
            submission_id: submission.id as i64,
            verdict: Verdict::Accepted,
            message: None,
            execution_time: None,
            memory_usage: None,
            judge_output: None,
            test_results: vec![],
        });
    }

    // 6. Run the code against each test case.
    let mut test_results: Vec<TestResultDTO> = Vec::with_capacity(test_cases.len());
    let mut overall_verdict = Verdict::Accepted;
    let mut max_time_ms: u32 = 0;

    for tc in &test_cases {
        docker_client.inject_stdin(container_name, &tc.input).await?;

        let run_cmd = format!("{} < /tmp/stdin", submission.language.run_command());
        let start = Instant::now();
        let run_result = docker_client
            .run_command(
                container_name,
                vec!["bash".into(), "-c".into(), run_cmd],
                Some(DEFAULT_TIME_LIMIT),
            )
            .await;
        let elapsed_ms = start.elapsed().as_millis() as u32;
        max_time_ms = max_time_ms.max(elapsed_ms);

        let (tc_verdict, actual_output) = match run_result {
            Err(e) if e.to_string().contains("Time limit exceeded") => {
                (Verdict::TimeLimitExceeded, None)
            }
            Err(e) => (Verdict::InternalError, Some(e.to_string())),
            Ok(out) => {
                if out.exit_code != Some(0) {
                    let stderr = out.stderr_buf.map(|v| v.join(""));
                    (Verdict::RuntimeError, stderr)
                } else {
                    let actual = out.stdout_buf.map(|v| v.join("")).unwrap_or_default();
                    if actual.trim() == tc.expected.trim() {
                        (Verdict::Accepted, Some(actual))
                    } else {
                        (Verdict::WrongAnswer, Some(actual))
                    }
                }
            }
        };

        if overall_verdict == Verdict::Accepted && tc_verdict != Verdict::Accepted {
            overall_verdict = tc_verdict.clone();
        }

        test_results.push(TestResultDTO {
            test_case_id: tc.id,
            verdict: tc_verdict,
            execution_time: elapsed_ms,
            memory_kb: 0,
            actual_output,
        });
    }

    Ok(JudgeResultRequest {
        submission_id: submission.id as i64,
        verdict: overall_verdict,
        message: None,
        execution_time: Some(max_time_ms),
        memory_usage: None,
        judge_output: None,
        test_results,
    })
}

/// How a given language combines the student's source with the teacher's
/// validator into something runnable.
///
/// - `Concat`: append the two files. The validator declares the entry point
///   and references the student's function by name. Cheap and works for any
///   language without indent-sensitive scoping rules.
/// - `PythonImport`: keep the student source in its own module so a stray
///   indent in either side can't make the combined file un-parseable. The
///   validator gets `from student import *` prepended.
/// - `JsRequire`: same idea for JavaScript — the student file is loaded as
///   a string and evaluated in the validator's scope, so the validator can
///   call student functions without the student having to remember to
///   `module.exports = …`.
/// - `JavaPair`: keep the two as separate compilation units because Java
///   requires the source filename to match its public class.
enum CombineStrategy {
    Concat { source_path: String, build_cmd: Option<String>, run_cmd: String },
    PythonImport,
    JsRequire,
    JavaPair,
}

fn combine_strategy(language: &Language) -> CombineStrategy {
    match language {
        Language::Python     => CombineStrategy::PythonImport,
        Language::Javascript => CombineStrategy::JsRequire,
        Language::Typescript => CombineStrategy::Concat {
            source_path: "/tmp/run.ts".into(),
            build_cmd: None,
            run_cmd: "ts-node /tmp/run.ts".into(),
        },
        Language::Cpp => CombineStrategy::Concat {
            source_path: "/tmp/run.cpp".into(),
            build_cmd: Some("g++ /tmp/run.cpp -o /tmp/run_bin -lstdc++".into()),
            run_cmd: "/tmp/run_bin".into(),
        },
        Language::C => CombineStrategy::Concat {
            source_path: "/tmp/run.c".into(),
            build_cmd: Some("gcc /tmp/run.c -o /tmp/run_bin".into()),
            run_cmd: "/tmp/run_bin".into(),
        },
        Language::Rust => CombineStrategy::Concat {
            source_path: "/tmp/run.rs".into(),
            build_cmd: Some("rustc /tmp/run.rs -o /tmp/run_bin".into()),
            run_cmd: "/tmp/run_bin".into(),
        },
        Language::Go => CombineStrategy::Concat {
            source_path: "/tmp/run.go".into(),
            build_cmd: Some("go build -o /tmp/run_bin /tmp/run.go".into()),
            run_cmd: "/tmp/run_bin".into(),
        },
        Language::Swift => CombineStrategy::Concat {
            source_path: "/tmp/run.swift".into(),
            build_cmd: Some("swiftc /tmp/run.swift -o /tmp/run_bin".into()),
            run_cmd: "/tmp/run_bin".into(),
        },
        // C# falls through to the concat strategy with a temporary console
        // project — kept simple by sticking everything in one file.
        Language::Csharp => CombineStrategy::Concat {
            source_path: "/tmp/run.cs".into(),
            build_cmd: Some("mkdir -p /tmp/run_proj && cp /tmp/run.cs /tmp/run_proj/Program.cs && cd /tmp/run_proj && dotnet new console --force >/dev/null 2>&1 && cp /tmp/run.cs Program.cs && dotnet build -o /tmp/run_proj/out >/dev/null 2>&1".into()),
            run_cmd: "dotnet /tmp/run_proj/out/run_proj.dll".into(),
        },
        Language::Java => CombineStrategy::JavaPair,
    }
}

/// Writes the combined source files for one test case into `container_name`,
/// compiles if needed, and runs the validator entry point.
async fn compile_and_run_combined(
    docker_client: &mut DockerClient,
    container_name: &str,
    language: &Language,
    student_source: &str,
    validator_source: &str,
) -> Result<(Verdict, Option<String>, u32), Box<dyn std::error::Error + Send + Sync>> {
    let strategy = combine_strategy(language);

    let (build_cmd, run_cmd): (Option<String>, String) = match &strategy {
        CombineStrategy::Concat { source_path, build_cmd, run_cmd } => {
            let combined = format!("{}\n\n{}\n", student_source, validator_source);
            docker_client.write_file(container_name, source_path, &combined).await?;
            (build_cmd.clone(), run_cmd.clone())
        }
        CombineStrategy::PythonImport => {
            // Student in its own module so an indent/scope quirk on either
            // side can't make the combined file un-parseable. `from student
            // import *` pulls every top-level name (so the validator can call
            // them directly), then the validator body runs in its own scope.
            docker_client
                .write_file(container_name, "/tmp/student.py", student_source)
                .await?;
            let wrapped = format!("from student import *\n\n{}\n", validator_source);
            docker_client
                .write_file(container_name, "/tmp/run.py", &wrapped)
                .await?;
            (None, "python /tmp/run.py".into())
        }
        CombineStrategy::JsRequire => {
            // Same idea for Node: load the student source as text and eval it
            // in the validator's scope so student functions/vars are visible
            // without the student needing to remember to `module.exports`.
            docker_client
                .write_file(container_name, "/tmp/student.js", student_source)
                .await?;
            let wrapped = format!(
                "const __fs = require('fs');\neval(__fs.readFileSync('/tmp/student.js', 'utf8'));\n\n{}\n",
                validator_source
            );
            docker_client
                .write_file(container_name, "/tmp/run.js", &wrapped)
                .await?;
            (None, "node /tmp/run.js".into())
        }
        CombineStrategy::JavaPair => {
            docker_client
                .write_file(container_name, "/tmp/Solution.java", student_source)
                .await?;
            docker_client
                .write_file(container_name, "/tmp/Validator.java", validator_source)
                .await?;
            (
                Some("javac /tmp/Solution.java /tmp/Validator.java -d /tmp".into()),
                "cd /tmp && java Validator".into(),
            )
        }
    };

    // Compile if needed.
    if let Some(cmd) = build_cmd {
        let build_out = docker_client
            .run_command(
                container_name,
                vec!["bash".into(), "-c".into(), cmd],
                Some(COMPILE_TIMEOUT),
            )
            .await;

        match build_out {
            Err(e) => {
                return Ok((Verdict::CompilationError, Some(e.to_string()), 0));
            }
            Ok(o) if o.exit_code != Some(0) => {
                let stderr = o.stderr_buf.map(|v| v.join("")).unwrap_or_default();
                return Ok((Verdict::CompilationError, Some(stderr), 0));
            }
            Ok(_) => {}
        }
    }

    // Run.
    let start = Instant::now();
    let run_result = docker_client
        .run_command(
            container_name,
            vec!["bash".into(), "-c".into(), run_cmd],
            Some(DEFAULT_TIME_LIMIT),
        )
        .await;
    let elapsed_ms = start.elapsed().as_millis() as u32;

    match run_result {
        Err(e) if e.to_string().contains("Time limit exceeded") => {
            Ok((Verdict::TimeLimitExceeded, None, elapsed_ms))
        }
        Err(e) => Ok((Verdict::InternalError, Some(e.to_string()), elapsed_ms)),
        Ok(out) => {
            let stdout_msg = out.stdout_buf.as_ref().map(|v| v.join(""));
            let stderr_msg = out.stderr_buf.as_ref().map(|v| v.join(""));
            let msg = stdout_msg
                .filter(|s| !s.trim().is_empty())
                .or(stderr_msg.filter(|s| !s.trim().is_empty()));
            if out.exit_code == Some(0) {
                Ok((Verdict::Accepted, msg, elapsed_ms))
            } else {
                Ok((Verdict::WrongAnswer, msg, elapsed_ms))
            }
        }
    }
}

/// Judges a challenge submission against inline test cases.
///
/// For each test case the student's source is combined with the teacher's
/// validator (concatenated for most languages, paired for Java), built fresh,
/// and run. The validator picks its own inputs, calls the student's function,
/// and exits 0 on success or non-zero on failure. Results are serialised as
/// JSON into judge_output; test_results is left empty.
async fn run_challenge(
    docker_client: &mut DockerClient,
    submission: &Submission,
    container_name: &str,
    test_cases: &[InlineTestCase],
) -> Result<JudgeResultRequest, Box<dyn std::error::Error + Send + Sync>> {
    let mut results: Vec<ChallengeTestResult> = Vec::with_capacity(test_cases.len());
    let mut overall_verdict = Verdict::Accepted;
    let mut max_time_ms: u32 = 0;

    for tc in test_cases {
        if tc.validator.trim().is_empty() {
            if overall_verdict == Verdict::Accepted {
                overall_verdict = Verdict::InternalError;
            }
            results.push(ChallengeTestResult {
                title: tc.title.clone(),
                output: Some(format!(
                    "No validator provided for language {:?}",
                    submission.language
                )),
                verdict: Verdict::InternalError,
                hidden: tc.hidden,
                time_ms: 0,
            });
            continue;
        }

        let (verdict, output, elapsed_ms) = compile_and_run_combined(
            docker_client,
            container_name,
            &submission.language,
            &submission.source_code,
            &tc.validator,
        )
        .await?;

        max_time_ms = max_time_ms.max(elapsed_ms);

        if overall_verdict == Verdict::Accepted && verdict != Verdict::Accepted {
            overall_verdict = verdict.clone();
        }

        results.push(ChallengeTestResult {
            title: tc.title.clone(),
            output,
            verdict,
            hidden: tc.hidden,
            time_ms: elapsed_ms,
        });
    }

    let output = ChallengeJudgeOutput::new(results);
    let judge_output_str = serde_json::to_string(&output)?;

    Ok(JudgeResultRequest {
        submission_id: submission.id as i64,
        verdict: overall_verdict,
        message: None,
        execution_time: Some(max_time_ms),
        memory_usage: None,
        judge_output: Some(judge_output_str),
        test_results: vec![],
    })
}
