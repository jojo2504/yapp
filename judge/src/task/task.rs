use std::time::{Duration, Instant};

use crate::{
    docker::DockerClient,
    models::{InlineTestCase, Submission, Verdict},
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
    docker_client.prepare_file(container_name, submission).await?;

    // 2. Compile (if the language requires it).
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
            Ok(_) => {} // compiled successfully
        }
    }

    // 3. Playground run (problem_id == 0, no inline test cases): execute once.
    if submission.problem_id == 0 && submission.inline_test_cases.as_ref().map_or(true, |v| v.is_empty()) {
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

/// Judges a challenge submission against inline test cases.
/// Results are serialised as JSON into judge_output; test_results is left empty.
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

        results.push(ChallengeTestResult {
            input: tc.input.clone(),
            expected: tc.expected.clone(),
            actual: actual_output,
            verdict: tc_verdict,
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
