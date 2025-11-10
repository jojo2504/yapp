mod docker;
mod models;
mod redis;
mod task;

use futures_util::StreamExt;
use crate::{docker::DockerClient, models::Submission, redis::RedisService, task::process_submission};
use ::redis::{AsyncCommands, RedisResult, aio::ConnectionManager};
use std::{sync::Arc, thread, time::Duration};
use tokio::{sync::Semaphore, time};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut redis_service = RedisService::new().await?;
    let docker_client = DockerClient::new_local_defaults()?;

    redis_service.clear_all().await?;

    let mut redis_service_clone = redis_service.clone();
    tokio::spawn(async move {
        let pubsub_conn = redis_service_clone.subscribe(&["new_jobs"]);
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
        }
    });

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(1000)).await;
    }
}
