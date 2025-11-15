use crate::{docker::DockerClient, models::{Output, Submission}};

pub async fn process_submission(docker_client: &mut DockerClient, submission: &Submission) -> Result<Output, Box<dyn std::error::Error + Send + Sync>> {
    let container_name = str::to_lowercase(&format!("{}_sandbox_{}", submission.language, submission.id));

    // Create the container for this specific submission
    if let Err(e) = docker_client.create_container(&container_name, &submission).await {
        eprintln!("create_container error: {:?}", e);
        docker_client.delete_container(&container_name).await.ok();
        return Err(e);
    }

    // Start the container, and run all required command and tests
    docker_client.start_container(&container_name).await?;

    println!("trying to build {}", &container_name);
    match docker_client.build(&container_name, submission).await {
        Ok(_) => (),
        Err(e) => {
            docker_client.delete_container(&container_name).await?;
            panic!("deleting all containers and exiting during build: {}", e);
        },
    };
    
    println!("trying to run code {}", &container_name);
    let output = match docker_client.run_command(&container_name, vec!["./main".to_string()], None).await {
        Ok(output) => output,
        Err(e) => {
            docker_client.delete_container(&container_name).await?;
            panic!("deleting all containers and exiting during code execution: {}", e);
        },
    };
    
    docker_client.delete_container(&container_name).await?;
    println!("deleted container");

    Ok(output)
}
