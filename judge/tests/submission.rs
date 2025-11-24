use judge::{models::{Job, Language, Problem, Submission, TestCase, TestCaseResult, Verdict}, task::{file_injector::FileInjector, process_submission}};
use judge::docker::DockerClient;
use rstest::rstest;

#[tokio::test]
#[rstest]
#[case(
    Job {
        submission: Submission::new(1, 1, 1, Language::Rust, r#"
        impl Solution {
            pub fn sum(a: i32, b: i32) {
                a + b
            }
        }
        "#.to_string()).build(),
        problem: Problem { problem_id: 1, function_name: "sum".to_string(), parameters: vec![("a".to_string(), Some("i32".to_string())), ("b".to_string(), Some("i32".to_string()))], return_type: "i32".to_string()},
        tests: vec![TestCase { problem_id: 1, input: "1 2".to_string(), expected: "3".to_string(), hidden: false }, TestCase { problem_id: 1, input: "2 4".to_string(), expected: "6".to_string(), hidden: false }]
    },
    &mut Submission::new(1, 1, 1, Language::Rust, r#"
    impl Solution {
        pub fn sum(a:i32, b:i32) -> i32 {
            println!("hello world");
            a + b
        }
    }
    "#.to_string())
    .verdict(Verdict::Accepted)
    .test_results(vec![TestCaseResult {verdict:Verdict::Accepted, test_case_id: 1, execution_time: 0, memory_kb: 0 }])
    .build()
)]

async fn test_language_sandbox(#[case] job: Job, #[case] mut submission: &mut Submission) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use judge::task::check_result;
    use uuid::Uuid;

    let mut docker_client = match DockerClient::new_local_defaults() {
        Ok(client) => client,
        Err(e) => {
            eprintln!("Failed to create Docker client: {e}");
            return Err(e);
        }
    };
    
    let uuid = Uuid::new_v4();

    let source_code = FileInjector::inject_rust(&job.problem, &job.tests, &mut submission.source_code, &uuid);
    submission.source_code = source_code;

    let result = process_submission(&mut docker_client, &submission).await?;
    check_result(&job.tests, &result, &mut submission, &uuid).await?;

    if !result.stderr_buf.is_none() { // error
        return Ok(());
    }

    assert_eq!(submission.verdict, Some(Verdict::Accepted));

    Ok(())
}