use std::time::Duration;

use crate::{docker::{self, DockerClient}, models::{Output, Submission}};

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

    // Create the container for this specific submission
    if let Err(e) = docker_client.create_container(&container_name, &submission).await {
        eprintln!("create_container error: {:?}", e);
        docker_client.delete_container(&container_name).await.ok();
        return Err(e);
    }

    // Start the container, and run all required command and tests
    docker_client.start_container(&container_name).await.map_err(|e| {
        let _ = docker_client.delete_container(&container_name);
        anyhow::anyhow!("starting container failed: {e}")
    })?;

    docker_client.prepare_file(&container_name, submission).await?;

    // println!("trying to build {}", &container_name);
    if submission.language.is_compiled() {
        docker_client.build(&container_name, submission, Some(Duration::from_secs(2))).await.map_err(|e| {
            let _ = docker_client.delete_container(&container_name);
            anyhow::anyhow!("build failed: {e}")
        })?;
    }
    let output = docker_client
        .run_command(&container_name, vec!["bash".to_string(), "-c".to_string(), submission.language.run_command()], None)
        .await
        .map_err(|e| {
            let _ = docker_client.delete_container(&container_name);
            anyhow::anyhow!("run program failed: {e}")
        })?;

    if output.exit_code != Some(0) {
        eprintln!("Error whem executing command {}:{}", &container_name, output.stderr_buf.as_ref().unwrap()[0]);
    }

    docker_client.delete_container(&container_name).await?;
    // println!("deleted container");

    Ok(output)
}
