mod models;
mod docker;

use std::num::NonZero;

use redis::{Commands, Connection};
use bollard::Docker;
use tempfile::NamedTempFile;

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

// fn see_all(connection: &mut Connection) -> redis::RedisResult<()> {
//     let strings: Vec<String> = connection.lrange("queue", 0, -1)?;
//     for string in &strings {
//         println!("{}\n", string);
//     }
//     Ok(())
// }

async fn redis_listener<F>(connection: &mut Connection, mut handler: F) -> redis::RedisResult<()>
where
    F: FnMut(Submission) + Send,
{
    loop {
        if connection.exists("queue")? {
            if let Some(submission) = retrieve_submission(connection)? {
                println!("found submission");
                handler(submission);
            }
        }
        else {
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
    tokio::spawn(async move {
        let _ = redis_listener(&mut connection_for_listener, move |submission| {
            let mut docker_client_clone = docker_client.clone();

            tokio::spawn(async move {
                
                let container_name = format!("rust_sandbox_{}", submission.id);
                // println!("preparing evaluation for container: {}", container_name);

                // Perform async Docker operations here
                if let Err(e) = docker_client_clone.create_container(&container_name, &submission).await {
                    eprintln!("create_container error: {:?}", e);
                }

                if let Ok(output) = docker_client_clone.start_container(&container_name).await {
                    // println!("{:#?}", output.stdout_buf);
                    // println!("{:#?}", output.stderr_buf);
                    // println!("{:#?}", output.exit_code);
                }

                if let Err(e) = docker_client_clone.delete_container(&container_name).await {
                    eprintln!("delete_container error: {:?}", e);
                }
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
        let submission = Submission::new(i, 1, 1, models::Language::Python, source_code.to_string());
        add_submission(&mut connection, &submission)?;
    }

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(1000)).await;
    }
}
