use std::time::Duration;

use crate::{docker::DockerClient, models::{Output, Submission}};

pub async fn process_submission(docker_client: &mut DockerClient, submission: &Submission) -> Result<Output, Box<dyn std::error::Error + Send + Sync>> {
    let container_name = str::to_lowercase(&format!("{}_sandbox_{}", submission.language, submission.id));

    // Create the container for this specific submission
    if let Err(e) = docker_client.create_container(&container_name, &submission).await {
        eprintln!("create_container error: {:?}", e);
        docker_client.delete_container(&container_name, submission).await.ok();
        return Err(e);
    }

    // Start the container, and run all required command and tests
    docker_client.start_container(&container_name).await?;

    // println!("trying to build {}", &container_name);
    if submission.language.is_compiled() {
        docker_client.build(&container_name, submission, Some(Duration::from_secs(2))).await.map_err(|e| {
            let _ = docker_client.delete_container(&container_name, submission);
            anyhow::anyhow!("build failed: {e}")
        })?;
    }
    let output = docker_client
        .run_command(&container_name, vec!["bash".to_string(), "-c".to_string(), submission.language.run_command()], None)
        .await
        .map_err(|e| {
            let _ = docker_client.delete_container(&container_name, submission);
            anyhow::anyhow!("build failed: {e}")
        })?;

    docker_client.delete_container(&container_name, submission).await?;
    // println!("deleted container");

    Ok(output)
}
