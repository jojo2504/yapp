use std::time::SystemTime;

use bollard::errors::Error;
use tokio::time;

use crate::{docker::DockerClient, models::{Output, Submission}};

pub async fn process_submission(docker_client: &mut DockerClient, submission: &Submission) -> Result<Output, Box<dyn std::error::Error>> {
    let container_name = format!("{}_sandbox_{}{}", submission.language, submission.id, submission.user_id);

    if let Err(e) = docker_client
        .create_container(&container_name, &submission)
        .await
    {
        eprintln!("create_container error: {:?}", e);
        docker_client.delete_container(&container_name).await.ok();
        return Err(e);
    }

    let output = docker_client
        .start_container(&container_name)
        .await
        .ok()
        .unwrap();

    docker_client.delete_container(&container_name).await.ok();

    Ok(output)
}
