use std::{fs::{self, File}, io::Write, path::PathBuf, time::Duration};

use bollard::{Docker, container::LogOutput, query_parameters::{CreateContainerOptionsBuilder, LogsOptions, RemoveContainerOptions, StartContainerOptions, StopContainerOptions, WaitContainerOptions}, secret::{ContainerCreateBody, ContainerWaitResponse}};
use tokio::time::timeout;
use futures_util::stream::StreamExt;

use crate::{models::Submission};

#[derive(Default, Clone, Debug)]
pub struct Output {
    pub stdout_buf: Option<Vec<String>>,
    pub stderr_buf: Option<Vec<String>>,
    pub exit_code: Option<u8>
}

#[derive(Clone)]
pub struct DockerClient {
    docker: Docker
}

impl DockerClient {
    pub fn new_local_defaults() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            docker: Docker::connect_with_local_defaults().unwrap()
        })
    }

    pub fn from(docker: Docker) -> Self {
        Self { 
            docker: docker
        }
    }

    pub async fn create_container(&self, container_name: &str, submission: &Submission) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let filename = format!("/shared/{}.rs", container_name);
        let mut file = File::create(&filename)?;
        file.write_all(&submission.source_code.as_bytes())?;
        file.flush()?;

        println!("AAAAAAAAAAAAAAAAAAAAAAA: {}", &filename);

        let params = CreateContainerOptionsBuilder::new()
        .name(container_name)
        .build();

        let config = ContainerCreateBody {
            image: Some("rust-sandbox".to_string()),
            cmd: Some(vec![format!("timeout 2 rustc {}.rs && ./{}", container_name, container_name).to_string()]),
            host_config: Some(bollard::models::HostConfig {
                network_mode: Some("none".to_string()),
                memory: Some(100000000),
                memory_swap: Some(100000000),
                pids_limit: Some(50),
                cap_drop: Some(vec!["ALL".to_string()]),
                binds: Some(vec![
                    "shared:/sandbox".to_string(),
                ]),
                ..Default::default()
            }),
            ..Default::default()
        };
        self.docker.create_container(Some(params), config).await?;

        // println!("created container");
        Ok(())

    }

    pub async fn start_container(&mut self, container_name: &str) -> Result<Output, Box<dyn std::error::Error + Send + Sync>> {
        let mut container_output = Output::default();
        // println!("{}", container_name);
        
        let run_future = async {
            let _ = self.docker.start_container(container_name, None::<StartContainerOptions>).await;

            // logs
            let options = LogsOptions {
                stdout: true,
                stderr: true,
                follow: true,
                ..Default::default()
            };
            
            let mut logs = self.docker.logs(container_name, Some(options));
            while let Some(log_result) = logs.next().await {
                match log_result {
                    Ok(output) => match output {
                        LogOutput::StdOut { message } => {
                            let s = String::from_utf8_lossy(&message).to_string();
                            if let Some(ref mut buf) = container_output.stdout_buf {
                                buf.push(s);
                            } else {
                                container_output.stdout_buf = Some(vec![s]);
                            }
                        }
                        LogOutput::StdErr { message } => {
                            let s = String::from_utf8_lossy(&message).to_string();
                            if let Some(ref mut buf) = container_output.stderr_buf {
                                buf.push(s);
                            } else {
                                container_output.stderr_buf = Some(vec![s]);
                            }
                        }
                        _ => {}
                    },
                    Err(e) => eprintln!("Log error: {}", e),
                }
            }

            // wait for completion and get exit code
            let mut wait_stream = self.docker.wait_container(
                container_name,
                Some(WaitContainerOptions {
                    condition: "not-running".to_string(),
                }),
            );

            while let Some(Ok(ContainerWaitResponse { status_code, .. })) = wait_stream.next().await {
                container_output.exit_code = Some(status_code as u8);
                println!("Container exited with code: {}: {}", status_code, container_name);
            }
        };

        match timeout(Duration::from_secs(4), run_future).await {
            // Ok(_) => println!("finished within 1 sec {}", container_name),
            Ok(_) => {
                // println!();
            },
            Err(_) => {
                eprintln!("Container {} timed out", container_name);
                self.docker.stop_container(container_name, None::<StopContainerOptions>).await.ok();
            },
        }    

        Ok(container_output)

    }

    pub async fn delete_container(&self, container_name: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // println!("deleting container {}", container_name);
        self.docker.remove_container(container_name, Some(RemoveContainerOptions::default())).await?;
        let filename = format!("/shared/{}.rs", container_name);
        fs::remove_file(&filename).ok(); // Ignore errors if file doesn't exist

        Ok(())
    }
}