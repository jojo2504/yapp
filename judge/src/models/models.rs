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

impl Language {
    pub fn extension(&self) -> String {
        let extension = match self {
            Language::Python => "py",
            Language::Rust => "rs",
            Language::Csharp => "cs",
            Language::C => "c",
            Language::Cpp => "cpp",
            Language::Javascript => "js",
            Language::Typescript => "ts",
            Language::Go => "go",
            Language::Java => "java",
            Language::Swift => "swift",
        };
        extension.to_string()
    }

    // Represent the language sandbox container prefix
    pub fn sandbox_name(&self) -> String {
        let sandbox_name = match self {
            Language::Python => "python-sandbox",
            Language::Rust => "rust-sandbox",
            Language::Csharp => "dotnet-sdk-sandbox",
            Language::C => "gcc-sandbox",
            Language::Cpp => "gcc-sandbox",
            Language::Javascript => "node-js-sandbox",
            Language::Typescript => "node-ts-sandbox",
            Language::Go => "golang-sandbox",
            Language::Java => "openjdk-sandbox",
            Language::Swift => "swift-sandbox",
        };
        sandbox_name.to_string()
    }

    pub fn build_command(&self) -> String {
        match self {
            Language::Python => unreachable!("There is no build step for Python"),
            Language::Rust => "rustc main.rs",
            Language::Csharp => "dotnet build",
            Language::C => "gcc main.c -o main",
            Language::Cpp => "gcc main.cpp -o main",
            Language::Javascript => unreachable!("There is no build step for Javascript"),
            Language::Typescript => unreachable!("There is no build step for Typescript"),
            Language::Go => "go build -o main",
            Language::Java => unimplemented!(),
            Language::Swift => "swiftc main.swift -o main",
        }.to_string()
    }

    pub fn is_compiled(&self) -> bool {
        match self {
            Language::Python => false,
            Language::Javascript => false,
            Language::Typescript => false, // TS compiles to JS but is not executed as binary
            _ => true
        }
    }

    pub fn run_command(&self) -> String {
        match self {
            Language::Python => "python main.rs",
            Language::Javascript => "node main.js",
            Language::Typescript => "node main.ts", // TS compiles to JS but is not executed as binary
            _ => "./main"
        }.to_string()
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

pub struct TestCase {
    pub problem_id: u64,
	pub input: String, // the json version of the input 
	pub expected: String, // the json version of the output
	pub hidden: bool
}

pub struct Job {
    pub submission: Submission,
    pub tests: Vec<TestCase> // test all testcases with the submitted code 
}