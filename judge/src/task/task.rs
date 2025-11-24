use std::time::Duration;

use crate::{docker::DockerClient, models::{Output, Submission, TestCase, Verdict}};
use colored::Colorize;
use uuid::Uuid;

/// Process a code submission and fill all submissions's optional fields to then send back to Go
/// 
/// It processes a submission in 5 steps:
/// - inject to the file all necessary boilerplate to test and run the code 
/// - build the code into a binary file if the language is compiled
/// - run the binary / run the necessary command to run the code
/// - fill the submission's fields
/// - return and send to go
pub async fn process_submission(docker_client: &mut DockerClient, submission: &Submission) -> Result<Output, Box<dyn std::error::Error + Send + Sync>> {
    let container_name = str::to_lowercase(&format!("{}_sandbox_{}", submission.language, submission.id));
    
    // If anything fails after this, we still want cleanup
    let result = async {
        docker_client.create_container(&container_name, submission).await?;
        docker_client.start_container(&container_name).await?;
        docker_client.prepare_file(&container_name, submission).await?;

        if submission.language.is_compiled() {
            docker_client.build(&container_name, submission, Some(Duration::from_secs(10))).await?;
        }

        let output = docker_client
            .run_command(
                &container_name,
                vec!["bash".into(), "-c".into(), submission.language.run_command()],
                None,
            )
            .await?;

        if output.exit_code != Some(0) {
            eprintln!(
                "{} executing {}: {}",
                "Error".red(),
                &container_name,
                output.stderr_buf.as_ref().unwrap()[0]
            );
        }

        Ok(output)
    }
    .await;

    // cleanup
    let _ = docker_client.delete_container(&container_name).await;

    result
}

pub async fn check_result(tests: &Vec<TestCase>, output: &Output, submission: &mut Submission, uuid: &Uuid) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let stdout = output.stdout_buf.as_ref().expect("stdout shouldnt not be empty except during error");
    let (results, others): (Vec<String>, Vec<String>) = stdout.iter()
    .flat_map(|x| x.split("\n"))
    .filter(|s| !s.is_empty())
    .map(|s| s.to_string())
    .partition(|s| s.starts_with(&uuid.to_string()));

    println!("results {:?}", results);
    println!("others {:?}", others);
    
    submission.verdict = Some(Verdict::Accepted);
    for i in 0..tests.len() {
        let result: Vec<&str> = results[i].split(" ").collect::<Vec<_>>();
        if *result.first().unwrap() == uuid.to_string() && tests[i].expected != *result.last().unwrap() {
            submission.verdict = Some(Verdict::WrongAnswer);
            break;
        }
    }

    Ok(())
}
