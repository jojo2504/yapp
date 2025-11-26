use std::{collections::HashMap, time::Duration};

use crate::{docker::{CommandConfig, DockerClient}, models::{Job, Output, Submission, TestCase, TestCaseResult, Verdict}, task::file_injector::FileInjector};
use bollard::{exec::CreateExecOptions, query_parameters::TopOptions};
use colored::Colorize;
use uuid::Uuid;

macro_rules! handle_docker_error {
    ($expr:expr, $submission:expr) => {
        match $expr.await {
            Ok(v) => v,
            Err(e) => {
                $submission.verdict = Some(Verdict::InternalError);
                return Err(e);
            }
        }
    };
}

/// Process a job and fill all submissions's optional fields to then send back to Go
/// 
/// It processes a job in 5 steps:
/// - inject to the file all necessary boilerplate to test and run the code 
/// - build the code into a binary file if the language is compiled
/// - run the binary / run the necessary command to run the code
/// - fill the submission's fields
/// - return and send to go
pub async fn process_job(docker_client: &mut DockerClient, job: &mut Job, uuid: &Uuid) -> Result<Vec<Output>, Box<dyn std::error::Error + Send + Sync>> {
    let container_name = str::to_lowercase(&format!("{}_sandbox", uuid));
    
    let source_code = FileInjector::inject(&job.submission.language, &job.problem, &mut job.submission.source_code, &uuid);
    job.submission.source_code = source_code;

    // If anything fails after this, we still want cleanup
    let result = async {
        let mut output_results: Vec<Output> = vec![];

        let options = CreateExecOptions {
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            working_dir: Some("/tmp".to_string()),  // Execute commands in /tmp
            ..Default::default()
        };

        let config = CommandConfig::new(&container_name, options).build();

        handle_docker_error!(
            docker_client.create_container(&container_name, &job.submission),
            job.submission
        );
        
        handle_docker_error!(
            docker_client.start_container(&container_name),
            job.submission
        );
        
        handle_docker_error!(
            docker_client.prepare_file(&job.submission, config.clone()),
            job.submission
        );

        if job.submission.language.is_compiled() {
            match docker_client.build(&job.submission, config.clone()).await {
                Ok(output) => {
                    if output.exit_code != Some(0) {
                        job.submission.verdict = Some(Verdict::CompilationError);
                        job.submission.message = Some(format!("{:?}", output.stderr_buf));
                        println!("{:?}", job.submission.message);
                        return Ok(vec![output])
                    }
                },
                Err(e) => return Err(e)
            };
        }

        let options_input = CreateExecOptions {
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            attach_stdin: Some(true),
            working_dir: Some("/tmp".to_string()),  // Execute commands in /tmp
            cmd: Some(vec!["bash".to_string(), "-c".to_string(), job.submission.language.run_command()]),
            ..Default::default()
        };
        let config_input = CommandConfig::new(&container_name, options_input).build();

        for (idx, test) in job.tests.iter().enumerate() {
            println!("inputs: {}", &test.input);
            let output = docker_client.run_command(
                config_input.clone(),
                Some(&test.input),  // e.g., "1 2\n"
            ).await?;

            output_results.push(output.clone());
            
            let (verdict, user_stdout) = 
                if let Some(stdout) = output.stdout_buf { // got an stdout, checking for returned value and user stdout
                    let (results, others): (Vec<String>, Vec<String>) = stdout.iter()
                    .flat_map(|x| x.split("\n"))
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
                    .partition(|s| s.starts_with(&uuid.to_string()));
                    
                    if let Some(result_line) = results.into_iter().next() { // have a returned value
                        println!("result_line {:?}", result_line);
                        println!("user stdout {:?}", others);
                        
                        let mut verdict = Verdict::Accepted;
                        job.submission.verdict = Some(Verdict::Accepted);
                        let result: Vec<&str> = result_line.split(" ").collect::<Vec<_>>();
                        if *result.first().unwrap() == uuid.to_string() && test.expected != *result.last().unwrap() {
                            job.submission.verdict = Some(Verdict::WrongAnswer);
                            verdict = Verdict::WrongAnswer;
                        }
                        
                        (verdict, Some(others).filter(|s| !s.is_empty()))
                    }
                    else { // doesn't have a returned value
                        (Verdict::RuntimeError, Some(others).filter(|s| !s.is_empty()))
                    }
                }
                else { // no stdout at all, means we got an error for sure
                    job.submission.verdict = Some(Verdict::RuntimeError);
                    (Verdict::RuntimeError, None)
                };
                
                job.submission.test_results
                .get_or_insert_with(Vec::new)
                .push(TestCaseResult {
                    test_case_id: test.problem_id,
                    verdict: verdict.clone(),
                    execution_time: 0,
                    memory_kb: 0,
                    stdout: user_stdout.map(|vec| vec.join("\n"))
                });        
            };
           
        Ok(output_results)
    }
    .await?;

    // cleanup
    docker_client.delete_container(&container_name).await?;

    Ok(result)
}
