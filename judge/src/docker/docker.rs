use std::time::Duration;

use bollard::{Docker, container::LogOutput, exec::{CreateExecOptions, StartExecOptions, StartExecResults}, query_parameters::{CreateContainerOptionsBuilder, RemoveContainerOptions, StartContainerOptions, StopContainerOptions}, secret::ContainerCreateBody};
use tokio::time::timeout;
use futures_util::stream::StreamExt;

use crate::models::{Output, Submission};

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
    pub async fn build(&self, container_name: &str, submission: &Submission, time_limit: Option<Duration>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.run_command(container_name, vec!["bash".to_string(), "-c".to_string(), submission.language.build_command().expect("")], time_limit).await?;
        // println!("finished building");
        Ok(())
    }

    /// file injection based on language
    pub async fn prepare_file(&self, container_name: &str, submission: &Submission) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let filename = format!("/tmp/main.{}", submission.language.extension());
        let source = &submission.source_code;

        // Create the file using cat with heredoc to handle multi-line content properly
        let cmd = vec![
            "bash".to_string(),
            "-c".to_string(),
            format!("cat > {} << 'EOFMARKER'\n{}\nEOFMARKER", filename, source),
        ];

        self.run_command(container_name, cmd, None).await?;

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
    pub async fn run_command(&self, container_name: &str, command: Vec<String>, time_limit: Option<Duration>) -> Result<Output, Box<dyn std::error::Error + Send + Sync>> {
        let config = CreateExecOptions {
            cmd: Some(command),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            working_dir: Some("/tmp".to_string()),  // Execute commands in /tmp
            ..Default::default()
        };
        
        // println!("running command");
        let exec = self.docker.create_exec(container_name, config).await?;
        
        // Start the exec once and get the stream
        let stream = self.docker.start_exec(&exec.id, None::<StartExecOptions>).await?;
        
        // Apply timeout to the entire stream processing
        let container_output = match timeout(
            time_limit.unwrap_or(Duration::from_secs(1)),
            self.process_stream(stream, &exec.id)
        ).await {
            Ok(result) => result?,
            Err(_) => {
                let _ = self.delete_container(&container_name);
                return Err(format!("Time limit exceeded {}", &container_name).into())
            } 
        };
        
        if !container_output.stderr_buf.is_none() {
            eprintln!("container output stderr: {}", container_output.stderr_buf.as_ref().unwrap()[0])
        }
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


    /// Writes arbitrary `content` to `path` inside the container. Uses a
    /// heredoc with a distinctive marker so quoting/backslashes pass verbatim.
    pub async fn write_file(
        &self,
        container_name: &str,
        path: &str,
        content: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cmd = vec![
            "bash".to_string(),
            "-c".to_string(),
            format!("cat > {} << '_JUDGE_FILE_EOF_'\n{}\n_JUDGE_FILE_EOF_", path, content),
        ];
        self.run_command(container_name, cmd, None).await?;
        Ok(())
    }

    /// Writes `input` to `/tmp/stdin` inside the container so that the run
    /// command can redirect it with `< /tmp/stdin`.
    pub async fn inject_stdin(
        &self,
        container_name: &str,
        input: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cmd = vec![
            "bash".to_string(),
            "-c".to_string(),
            // Use a heredoc with a distinctive marker so arbitrary input
            // (including quotes and backslashes) is written verbatim.
            format!("cat > /tmp/stdin << '_JUDGE_STDIN_EOF_'\n{}\n_JUDGE_STDIN_EOF_", input),
        ];
        self.run_command(container_name, cmd, None).await?;
        Ok(())
    }

    pub async fn delete_container(&self, container_name: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let stop_opts = StopContainerOptions { t: Some(0), ..Default::default() };
        self.docker.stop_container(container_name, Some(stop_opts)).await?;
        self.docker.remove_container(container_name, Some(RemoveContainerOptions::default())).await?;
        Ok(())
    }
}