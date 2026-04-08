mod docker;
mod models;
mod redis;
mod request;
mod task;

use crate::{
    docker::DockerClient,
    models::Submission,
    redis::RedisService,
    request::ReqwestClient,
    task::process_submission,
};
use std::sync::Arc;
use tokio::sync::Semaphore;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut redis_service = RedisService::new().await?;
    let docker_client = DockerClient::new_local_defaults()?;
    let reqwest_client = ReqwestClient::default();

    redis_service.clear_all().await?;

    let mut redis_service_clone = redis_service.clone();
    let handle: tokio::task::JoinHandle<()> = tokio::spawn(async move {
        let semaphore = Arc::new(Semaphore::new(100));
        let reqwest_client = Arc::new(reqwest_client);

        redis_service_clone
            .clone()
            .listen_pubstream(&["queue"], async move || {
                loop {
                    let raw = match redis_service_clone.fetch_job().await {
                        Ok(r) => r,
                        Err(e) => {
                            eprintln!("Error fetching job from Redis: {}", e);
                            break;
                        }
                    };
                    match raw {
                        Some(json) => {
                            let submission: Submission = match serde_json::from_str(&json) {
                                Ok(s) => s,
                                Err(e) => {
                                    eprintln!("Failed to deserialize submission: {}", e);
                                    continue;
                                }
                            };
                            println!("Got submission {:?}", submission);

                            let sem = Arc::clone(&semaphore);
                            let mut docker_clone = docker_client.clone();
                            let req_clone = Arc::clone(&reqwest_client);

                            tokio::spawn(async move {
                                let Ok(_permit) = sem.acquire().await else { return };
                                let _ = process_submission(
                                    &mut docker_clone,
                                    &req_clone,
                                    &submission,
                                )
                                .await;
                            });
                        }
                        None => {
                            break; // queue is empty, wait for next pub/sub message
                        }
                    }
                }
            })
            .await;
    });

    handle.await?;

    Ok(())
}
