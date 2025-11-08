mod docker;
mod models;
mod redis_service;

use futures_util::StreamExt;
use std::sync::Arc;
use tokio::sync::Semaphore;
use redis::{aio::ConnectionManager, AsyncCommands, RedisResult};

use crate::{docker::DockerClient, models::Submission, redis_service::RedisService};

async fn clear_all(connection_manager: &mut ConnectionManager) -> RedisResult<()> {
    let _: () = connection_manager.flushall().await?;
    Ok(())
}

async fn add_submission(redis_service: &mut RedisService, submission: &Submission) -> RedisResult<()> {
    let serialized = serde_json::to_string(submission).unwrap();
    let _: () = redis_service.manager.rpush("queue", serialized.clone()).await?;
    
    redis_service.publish("new_jobs", "new jobs").await?;

    Ok(())
}

async fn process_submission(docker_client: &mut DockerClient, submission: &Submission) {
    let container_name = format!("rust_sandbox_{}", submission.id);
    
    if let Err(e) = docker_client.create_container(&container_name, &submission).await {
        eprintln!("create_container error: {:?}", e);
        docker_client.delete_container(&container_name).await.ok();
    }

    let output = docker_client.start_container(&container_name).await.ok().unwrap();

    println!("{:#?}", output.stdout_buf);
    println!("{:#?}", output.stderr_buf);
    println!("{:#?}", output.exit_code);

    docker_client.delete_container(&container_name).await.ok();
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut redis_service = RedisService::new().await?;
    let docker_client = DockerClient::new_local_defaults()?;

    clear_all(&mut redis_service.manager).await?;

    let mut redis_service_clone = redis_service.clone();
    tokio::spawn(async move { 
        let pubsub_conn = redis_service_clone.subscribe(&["new_jobs"]);
        let mut pubsub = pubsub_conn.await.unwrap();
        let pubsub_stream = &mut pubsub.on_message();
        let semaphore = Arc::new(Semaphore::new(100));

        while let Some(msg) = pubsub_stream.next().await {
            let _: String = msg.get_payload().unwrap(); // the "ping" message content
    
            loop {
                let raw: Option<String> = redis_service_clone.manager.lpop("queue", None).await.unwrap();
                match raw {
                    Some(json) => {
                        let submission: Submission = serde_json::from_str(&json).unwrap();
                        // println!("Got submission {:?}", submission);
        
                        // Process job asynchronously, limited by semaphore
                        let sem = Arc::clone(&semaphore);
                        let mut docker_client_clone = docker_client.clone();
                        tokio::spawn(async move {
                            let _permit = sem.acquire().await.unwrap();
                            process_submission(&mut docker_client_clone, &submission).await;
                        });
                    }
                    None => {
                        break; // queue is empty
                    }
                }
            }
        };
    });

    for i in 0..10 {
        let source_code = r#"
            fn main() {
                println!("a");
            }
        "#;
        let submission = Submission::new(i, 1, 1, models::Language::Python, source_code.to_string());
        add_submission(&mut redis_service, &submission).await?;
        println!("added submission")
    }

    let a: Vec<String> = redis_service.manager.lrange("queue", 0, -1).await?;
    println!("queue: {:#?}", a);

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(1000)).await;
    }
}
