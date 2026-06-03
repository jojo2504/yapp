use reqwest::Client;
use serde::Serialize;

use crate::models::{TestCase, Verdict};

const BACKEND_URL: &str = "http://backend-go:8080";

/// The payload POSTed to `POST /api/result` after judging a submission.
#[derive(Debug, Serialize)]
pub struct JudgeResultRequest {
    pub submission_id: i64,
    pub verdict: Verdict,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub execution_time: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_usage: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub judge_output: Option<String>,
    pub test_results: Vec<TestResultDTO>,
}

/// Per-test-case outcome sent to the backend (problem submissions).
#[derive(Debug, Serialize)]
pub struct TestResultDTO {
    pub test_case_id: i64,
    pub verdict: Verdict,
    pub execution_time: u32,
    pub memory_kb: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actual_output: Option<String>,
}

/// Per-test-case outcome for challenge submissions (serialised into judge_output).
///
/// `title` is the human-readable name the teacher set on the validator.
/// `output` merges stdout and stderr from the combined student + validator
/// run — typically the validator's failure reason on a non-zero exit, or
/// compiler diagnostics on a build failure.
#[derive(Debug, Serialize)]
pub struct ChallengeTestResult {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
    pub verdict: Verdict,
    pub hidden: bool,
    pub time_ms: u32,
}

/// Top-level object serialised as judge_output for challenge submissions.
#[derive(Debug, Serialize)]
pub struct ChallengeJudgeOutput {
    pub test_cases: Vec<ChallengeTestResult>,
    pub passed: usize,
    pub total: usize,
}

impl ChallengeJudgeOutput {
    pub fn new(test_cases: Vec<ChallengeTestResult>) -> Self {
        let passed = test_cases.iter().filter(|r| matches!(r.verdict, Verdict::Accepted)).count();
        let total = test_cases.len();
        Self { test_cases, passed, total }
    }
}


#[derive(Clone)]
pub struct ReqwestClient {
    client: Client,
}

impl Default for ReqwestClient {
    fn default() -> Self {
        Self {
            client: Client::new(),
        }
    }
}

impl ReqwestClient {
    /// Fetches all test cases for a problem from the backend.
    pub async fn fetch_test_cases(
        &self,
        problem_id: u64,
    ) -> Result<Vec<TestCase>, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/judge/testcases/{}", BACKEND_URL, problem_id);
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("fetch_test_cases HTTP {}: {}", status, body).into());
        }
        Ok(resp.json::<Vec<TestCase>>().await?)
    }

    /// POSTs the judge verdict to the backend.
    pub async fn send_result(
        &self,
        result: &JudgeResultRequest,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/result", BACKEND_URL);
        let resp = self.client.post(&url).json(result).send().await?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("send_result HTTP {}: {}", status, body).into());
        }
        Ok(())
    }
}
