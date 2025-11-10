use std::fmt;

use serde::{Serialize, Deserialize};

#[derive(Default, Clone, Debug)]
pub struct Output {
    pub stdout_buf: Option<Vec<String>>,
    pub stderr_buf: Option<Vec<String>>,
    pub exit_code: Option<u8>
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Language {
    Python,
    Rust,
    Csharp,
    C,
    Cpp,
    Javascript,
    Typescript,
    Go,
    Java,
    Swift,
}

impl fmt::Display for Language {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Verdict {
    Pending,
    Accepted,
    WrongAnswer,
    TimeLimitExceeded,
    MemoryLimitExceeded,
    RuntimeError,
    CompilationError,
    InternalError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseResult {
    pub test_case_id: u64,
    pub verdict: Verdict,
    pub execution_time: u32,
    pub memory_kb: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submission {
    pub id: u64,
    pub user_id: u64,
    pub problem_id: u64,
    pub language: Language,
    pub source_code: String,
    pub verdict: Verdict,
    pub message: Option<String>,
    pub execution_time: Option<u32>,
    pub memory_usage: Option<u32>,
    pub judge_output: Option<String>,
    pub test_results: Option<Vec<TestCaseResult>>,
}

impl Submission {
    pub fn new(
        id: u64,
        user_id: u64,
        problem_id: u64,
        language: Language,
        source_code: String,
    ) -> Self {
        Self {
            id,
            user_id,
            problem_id,
            language,
            source_code,
            verdict: Verdict::Pending,
            message: None,
            execution_time: None,
            memory_usage: None,
            judge_output: None,
            test_results: None,
        }
    }
}