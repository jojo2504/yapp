use judge::{models::{Job, Language, Problem, Submission, TestCase, TestCaseResult, Verdict}, task::{file_injector::FileInjector, process_job}};
use judge::docker::DockerClient;
use rstest::rstest;

#[tokio::test]
#[rstest]
#[case( // Correct
    Job {
        submission: Submission::new(1, 1, 1, Language::Rust, r#"
        impl Solution {
            pub fn sum(a: i32, b: i32) -> i32 {
                println!("hello world");
                a + b
            }
        }
        "#.to_string()).build(),
        problem: Problem {problem_id:1,function_name:"sum".to_string(),parameters:vec![("a".to_string(),Some("i32".to_string())),("b".to_string(),Some("i32".to_string()))],return_type:"i32".to_string(), tests: {
            vec![
                TestCase { input: "1 2".to_string(), expected: "3".to_string(), hidden: false }, 
                TestCase { input: "2 4".to_string(), expected: "6".to_string(), hidden: false }
            ]}
        }
    },
    Submission::new(1, 1, 1, Language::Rust, "".to_string())
        .verdict(Verdict::Accepted)
        .test_results(vec![
            TestCaseResult {verdict:Verdict::Accepted, execution_time: 0, memory_kb: 0, stdout: Some(String::from("hello world")) },
            TestCaseResult {verdict:Verdict::Accepted, execution_time: 0, memory_kb: 0, stdout: Some(String::from("hello world")) }
        ])
        .build()
)]
#[case( // wrong Function Name, expected sum
    Job {
        submission: Submission::new(1, 1, 1, Language::Rust, r#"
        impl Solution {
            pub fn wrong_function_name(a: i32, b: i32) -> i32 {
                a + b
            }
        }
        "#.to_string()).build(),
        problem: Problem { problem_id: 1, function_name: "sum".to_string(), parameters: vec![("a".to_string(), Some("i32".to_string())), ("b".to_string(), Some("i32".to_string()))], return_type: "i32".to_string(), tests: {
            vec![
                TestCase { input: "1 2".to_string(), expected: "3".to_string(), hidden: false }, 
                TestCase { input: "2 4".to_string(), expected: "6".to_string(), hidden: false }
            ]}
        }
    },
    Submission::new(1, 1, 1, Language::Rust, "".to_string())
        .verdict(Verdict::CompilationError)
        .build()
)]
#[case( // Error code runtime but first testcase works
    Job {
        submission: Submission::new(1, 1, 1, Language::Rust, r#"
        impl Solution {
            pub fn sum(a: i32, b: i32) -> i32 {
                if b == 4 {
                    println!("hello world");
                    panic!()
                }
                if b == 6 {
                    panic!()
                }
                a + b
            }
        }
        "#.to_string()).build(),
        problem: Problem { problem_id: 1, function_name: "sum".to_string(), parameters: vec![("a".to_string(), Some("i32".to_string())), ("b".to_string(), Some("i32".to_string()))], return_type: "i32".to_string(), tests: {
            vec![
                TestCase { input: "1 2".to_string(), expected: "3".to_string(), hidden: false }, 
                TestCase { input: "2 4".to_string(), expected: "6".to_string(), hidden: false },
                TestCase { input: "1 2".to_string(), expected: "3".to_string(), hidden: false },
                TestCase { input: "1 6".to_string(), expected: "7".to_string(), hidden: false },
            ]}
        }
    },
    Submission::new(1, 1, 1, Language::Rust, "".to_string())
        .verdict(Verdict::RuntimeError)
        .test_results(vec![
            TestCaseResult { verdict: Verdict::Accepted, execution_time: 0, memory_kb: 0, stdout: None }, 
            TestCaseResult { verdict: Verdict::RuntimeError, execution_time: 0, memory_kb: 0, stdout: Some(String::from("hello world")) },
            TestCaseResult { verdict: Verdict::Accepted, execution_time: 0, memory_kb: 0, stdout: None },
            TestCaseResult { verdict: Verdict::RuntimeError, execution_time: 0, memory_kb: 0, stdout: None  }
        ])
        .build()
)]
async fn test_language_sandbox(#[case] mut job: Job, #[case] expected_submission: Submission) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use uuid::Uuid;

    let mut docker_client = match DockerClient::new_local_defaults() {
        Ok(client) => client,
        Err(e) => {
            eprintln!("Failed to create Docker client: {e}");
            return Err(e);
        }
    };
    
    let uuid = Uuid::new_v4();
    let result = process_job(&mut docker_client, &mut job, &uuid).await?;

    println!("verdict : {:?}", job.submission.verdict);
    println!("test_results : {:#?}", job.submission.test_results);

    assert_eq!(job.submission.verdict, expected_submission.verdict);
    assert_eq!(job.submission.test_results, expected_submission.test_results);

    Ok(())
}