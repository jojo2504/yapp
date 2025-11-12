mod docker;
mod models;
mod redis;
mod task;
mod request;

use crate::{docker::DockerClient, request::ReqwestClient, models::Submission, redis::RedisService, task::process_submission};
use futures_util::StreamExt;
use ::redis::AsyncCommands;
use std::sync::Arc;
use tokio::sync::Semaphore;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut redis_service = RedisService::new().await?;
    let docker_client = DockerClient::new_local_defaults()?;
    let reqwest_client = ReqwestClient::default();
    
    redis_service.clear_all().await?;

    let mut redis_service_clone = redis_service.clone();
    let handle: tokio::task::JoinHandle<()> = tokio::spawn(async move {
        let pubsub_conn = redis_service_clone.subscribe(&["queue"]);
        let mut pubsub = pubsub_conn.await.unwrap();
        let pubsub_stream = &mut pubsub.on_message();
        let semaphore = Arc::new(Semaphore::new(100));

        while let Some(msg) = pubsub_stream.next().await {
            let _: String = msg.get_payload().unwrap(); // the "ping" message content

            loop {
                let raw: Option<String> = redis_service_clone
                    .manager
                    .lpop("queue", None)
                    .await
                    .unwrap();
                match raw {
                    Some(json) => {
                        let submission: Submission = serde_json::from_str(&json).unwrap();
                        println!("Got submission {:?}", submission);

                        // Process job asynchronously, limited by semaphore
                        let sem = Arc::clone(&semaphore);
                        let mut docker_client_clone = docker_client.clone();
                        tokio::spawn(async move {
                            let _permit = sem.acquire().await.unwrap();
                            let output = process_submission(&mut docker_client_clone, &submission).await.unwrap();
                            println!("{}", output.stdout_buf.unwrap()[0]);
                            println!("{}", output.stderr_buf.unwrap()[0]);
                            println!("{}", output.exit_code.unwrap());
                        });
                    }
                    None => {
                        break; // queue is empty
                    }
                }
            }
        }
    });
    handle.await?; // Should always be blocked here to prevent program exit

    Ok(())
}
