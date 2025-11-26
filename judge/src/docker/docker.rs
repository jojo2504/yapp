use core::panic;
use std::time::Duration;

use bollard::{Docker, container::LogOutput, exec::{CreateExecOptions, StartExecOptions, StartExecResults}, query_parameters::{CreateContainerOptionsBuilder, RemoveContainerOptions, StartContainerOptions, StopContainerOptions}, secret::ContainerCreateBody};
use tokio::time::timeout;
use futures_util::stream::StreamExt;

use crate::models::{Output, Submission};

#[derive(Clone)]
pub struct CommandConfig {
    container_name: String,
    options: CreateExecOptions<String>,
    time_limit: Option<Duration>
}

impl CommandConfig {
    pub fn new(container_name: &str, options: CreateExecOptions<String>) -> CommandConfigBuilder {
        CommandConfigBuilder { 
            container_name: container_name.to_owned(), 
            options, 
            ..Default::default()
        }
    }
}

#[derive(Default)]
pub struct CommandConfigBuilder {
    container_name: String,
    options: CreateExecOptions<String>,
    time_limit: Option<Duration>
}

impl CommandConfigBuilder {
    pub fn time_limit(mut self, time_limit: Duration) -> Self {
        self.time_limit = Some(time_limit);
        self
    }

    pub fn build(self) -> CommandConfig {
        CommandConfig {
            container_name: self.container_name,
            options: self.options,
            time_limit: self.time_limit,
        }
    }
}

#[derive(Clone)]
pub struct DockerClient {
    docker: Docker
}

impl DockerClient {
    pub fn new_local_defaults() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        Ok(Self {
            docker: Docker::connect_with_local_defaults()?
        })
    }

    /// call build to build/compile a code source
    pub async fn build(&self, submission: &Submission, mut config: CommandConfig) -> Result<Output, Box<dyn std::error::Error + Send + Sync>> {
        config.options.cmd = Some(vec!["bash".to_string(), "-c".to_string(), submission.language.build_command().expect("")]);
        let output = self.run_command(config, None).await?;
        // println!("finished building");
        Ok(output)
    }

    /// file injection based on language
    pub async fn prepare_file(&self, submission: &Submission, mut config: CommandConfig) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let filename = format!("/tmp/main.{}", submission.language.extension());
        let source = &submission.source_code;

        // Create the file using cat with heredoc to handle multi-line content properly
        config.options.cmd = Some(vec![
            "bash".to_string(),
            "-c".to_string(),
            format!("cat > {} << 'EOFMARKER'\n{}\nEOFMARKER", filename, source),
        ]);

        self.run_command(config, None).await?;

        Ok(())
    }

    pub async fn create_container(&self, container_name: &str, submission: &Submission) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let params = CreateContainerOptionsBuilder::new()
        .name(container_name)
        .build();
        let config = ContainerCreateBody {
            image: Some(submission.language.sandbox_name()),
            entrypoint: Some(vec!["tail".to_string(), "-f".to_string(), "/dev/null".to_string()]),
            network_disabled: Some(true),
            working_dir: Some("/tmp".to_string()),
            host_config: Some(bollard::models::HostConfig {
                network_mode: Some("none".to_string()),
                memory: Some(512_000_000),      // 500 MB
                memory_swap: Some(512_000_000), // same as memory
                cpu_period: Some(100_000),
                cpu_quota: Some(50_000),        // 50% of a CPU
                pids_limit: Some(500),
                cap_drop: Some(vec!["ALL".to_string()]),
                ..Default::default()
            }),
            ..Default::default()
        };
        
        self.docker.create_container(Some(params), config).await?;

        // println!("created container");
        Ok(())
    }

    pub async fn start_container(&mut self, container_name: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.docker.start_container(container_name, None::<StartContainerOptions>).await?;       
        Ok(())
    }
    
    /// default `time_limit` if not specified is 1 second
    pub async fn run_command(&self, config: CommandConfig, inputs: Option<&str>) -> Result<Output, Box<dyn std::error::Error + Send + Sync>> {        
        let exec = self.docker.create_exec(&config.container_name, config.options).await?;
        
        let stream = self.docker.start_exec(&exec.id, Some(StartExecOptions::default())).await?;
        
        // Handle stdin writing separately, then reconstruct for process_stream
        let stream_for_processing = match stream {
            StartExecResults::Attached { output, mut input } => {
                // Write to stdin if inputs are provided
                if let Some(input_data) = inputs {
                    use tokio::io::AsyncWriteExt;
                    input.write_all(input_data.as_bytes()).await?;
                    input.shutdown().await?; // Close stdin to signal EOF
                }
                // Reconstruct StartExecResults with just the output stream
                StartExecResults::Attached { output, input }
            },
            other => other,
        };
        
        // Apply timeout to the entire stream processing
        let container_output = match timeout(
            config.time_limit.unwrap_or(Duration::from_secs(1)),
            self.process_stream(stream_for_processing, &exec.id)
        ).await {
            Ok(result) => result?,
            Err(_) => {
                let _ = self.delete_container(&config.container_name);
                return Err(format!("Time limit exceeded {}", &config.container_name).into())
            } 
        };
        
        Ok(container_output)
    }

    async fn process_stream(&self, stream: StartExecResults, exec_id: &str) -> Result<Output, Box<dyn std::error::Error + Send + Sync>> {
        let mut container_output = Output::default();
        
        // Match on the enum to get the actual stream
        if let StartExecResults::Attached { mut output, .. } = stream {
            while let Some(log_result) = output.next().await {
                match log_result {
                    Ok(log_output) => match log_output {
                        LogOutput::StdOut { message } => {
                            let s = String::from_utf8_lossy(&message).to_string();
                            // print!("{}", s); // Log to current stream
                            if let Some(ref mut buf) = container_output.stdout_buf {
                                buf.push(s);
                            } else {
                                container_output.stdout_buf = Some(vec![s]);
                            }
                        }
                        LogOutput::StdErr { message } => {
                            let s = String::from_utf8_lossy(&message).to_string();
                            // eprint!("{}", s); // Log to current stream (stderr)
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
        }
        
        // Inspect the exec to get the exit code
        let exec_inspect = self.docker.inspect_exec(exec_id).await?;
        if let Some(exit_code) = exec_inspect.exit_code {
            container_output.exit_code = Some(exit_code as u8);
        }
            
        Ok(container_output)
    }

    pub async fn delete_container(&self, container_name: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let stop_opts = StopContainerOptions { t: Some(0), ..Default::default() };
        self.docker.stop_container(container_name, Some(stop_opts)).await?;
        self.docker.remove_container(container_name, Some(RemoveContainerOptions::default())).await?;
        Ok(())
    }
}