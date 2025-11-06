mod docker;
mod models;

use std::{num::NonZero, pin::Pin};

use futures_util::future::ok;
use redis::{Commands, Connection};
use std::sync::Arc;
use tokio::sync::Semaphore;

use crate::{docker::DockerClient, models::Submission};

fn clear_all(connection: &mut Connection) -> redis::RedisResult<()> {
    let _: () = connection.flushall()?;
    Ok(())
}

fn add_submission(connection: &mut Connection, submission: &Submission) -> redis::RedisResult<()> {
    let serialized = serde_json::to_string(submission).unwrap();
    let _: () = connection.rpush("queue", serialized)?;
    Ok(())
}

fn retrieve_submission(connection: &mut Connection) -> redis::RedisResult<Option<Submission>> {
    let raw_submission: Vec<String> = connection.lpop("queue", NonZero::new(1))?;
    if raw_submission.len() == 1 {
        let serialize: Submission = serde_json::from_str(&raw_submission[0]).unwrap();
        return Ok(Some(serialize));
    }

    Ok(None)
}

async fn redis_listener<F>(connection: &mut Connection, mut handler: F) -> redis::RedisResult<()>
where
    F: FnMut(Submission, Arc<Semaphore>)
{
    let semaphore = Arc::new(Semaphore::new(100));
    loop {
        if connection.exists("queue")? {
            if let Some(submission) = retrieve_submission(connection)? {
                let semaphore = Arc::clone(&semaphore);

                handler(submission, semaphore);
            }
        } else {
            // println!("no submission");
        }
        tokio::time::sleep(std::time::Duration::from_millis(1)).await; // avoid redis query spam
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let redis_client = redis::Client::open("redis://redis:6379")?;
    let mut connection = redis_client.get_connection()?;
    let mut connection_for_listener = redis_client.get_connection()?;
    let docker_client = DockerClient::new_local_defaults()?;

    clear_all(&mut connection)?;
    let _ = tokio::spawn(async move {
        let _ = redis_listener(&mut connection_for_listener, move |submission: Submission, semaphore: Arc<Semaphore>| {
            let mut docker_client_clone = docker_client.clone();

            let _ = tokio::spawn(async move {
                let _permit = semaphore.acquire().await.unwrap();
                let container_name = format!("rust_sandbox_{}", submission.id);
                
                if let Err(e) = docker_client_clone.create_container(&container_name, &submission).await {
                    eprintln!("create_container error: {:?}", e);
                    docker_client_clone.delete_container(&container_name).await.ok();
                }

                let output = docker_client_clone.start_container(&container_name).await.ok();
                docker_client_clone.delete_container(&container_name).await.ok();
            });
        })
        .await;
    });

    for i in 0..1000 {
        let source_code = r#"
            fn main() {
                println!("a");
            }
        "#;
        let submission =
            Submission::new(i, 1, 1, models::Language::Python, source_code.to_string());
        add_submission(&mut connection, &submission)?;
    }

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(1000)).await;
    }
}
