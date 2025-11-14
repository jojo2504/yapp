mod docker;
mod models;
mod redis;
mod task;
mod request;

use crate::{docker::DockerClient, request::ReqwestClient, models::Submission, redis::RedisService, task::process_submission};
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
        let semaphore = Arc::new(Semaphore::new(100));
        redis_service_clone.clone().listen_pubstream(&["queue"], async move || {
            loop {
                let raw = redis_service_clone.fetch_job().await.unwrap();
                match raw {
                    Some(json) => {
                        let submission: Submission = serde_json::from_str(&json).unwrap();
                        // println!("Got submission {:?}", submission);

                        // Process job asynchronously, limited by semaphore
                        let sem = Arc::clone(&semaphore);
                        let mut docker_client_clone = docker_client.clone();
                        tokio::spawn(async move {
                            let _ = sem.acquire().await.unwrap();
                            let _ = process_submission(&mut docker_client_clone, &submission).await;
                        });
                    }
                    None => {
                        break; // queue is empty
                    }
                }
            }
        }).await;
    });
    handle.await?; // Should always be blocked here to prevent program exit

    Ok(())
}
