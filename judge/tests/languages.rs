use judge::{models::{Language, Submission}, task::process_submission};
use judge::docker::DockerClient;
use rstest::rstest;

#[tokio::test]
#[rstest]
#[case(Language::Python, r#"print("hello world")"#, 0)]
#[case(Language::Javascript, r#"console.log("hello world");"#, 0)]
#[case(Language::Typescript, r#"console.log("hello world");"#, 0)]
#[case(
    Language::C,
    r#"#include <stdio.h>
    int main() {
        printf("hello world\n");
        return 0;
    }"#,
    0
)]
#[case(
    Language::Cpp,
    r#"#include <iostream>
    int main() {
        std::cout << "hello world" << std::endl;
        return 0;
    }"#,
    0
)]
#[case(
    Language::Csharp,
    r#"using System;
    class Program {
        static void Main() {
            Console.WriteLine("hello world");
        }
    }"#,
    0
)]
#[case(
    Language::Go,
    r#"package main
    import "fmt"
    func main() {
        fmt.Println("hello world")
    }"#,
    0
)]
#[case(
    Language::Rust,
    r#"fn main() {
        println!("RUST hello world");
    }"#,
    0
)]
async fn test_language_sandbox(#[case] language: Language, #[case] code: &str, #[case] expected: u8) -> Result<(), Box<dyn std::error::Error + Send + Sync>>{
    let mut docker_client = match DockerClient::new_local_defaults() {
        Ok(client) => client,
        Err(e) => {
            eprintln!("Failed to create Docker client: {e}");
            return Err(e);
        }
    };

    let submission = Submission::new(
        1,        // user_id
        1 as u64, // problem_id (unique per language for demo)
        1,        // maybe contest_id or similar
        language.clone(),
        code.to_string(),
    );

    let result = process_submission(&mut docker_client, &submission).await;

    let result = match result {
        Ok(r) => {
            r
        }
        Err(e) => {
            eprintln!("process_submission failed: {e}");
            return Err(e);
        }
    };

    // --- Step 4. Check exit code ---
    match result.exit_code {
        Some(exit_code) => {
            assert_eq!(exit_code, expected, "Unexpected exit code for {:?}", language);
            return Ok(());
        }
        None => {
            eprintln!("No exit_code returned for {:?}", language);
            eprintln!("{}", result.stderr_buf.unwrap()[0]);
            panic!("process_submission returned None for exit_code");
        }
    } 
}
