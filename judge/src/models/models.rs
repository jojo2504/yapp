use std::fmt;

use serde::{Serialize, Deserialize};

#[derive(Default, Clone, Debug)]
pub struct Output {
    pub stdout_buf: Option<Vec<String>>,
    pub stderr_buf: Option<Vec<String>>,
    pub exit_code: Option<u8>
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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
    #[default]
    None
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
            Language::None => unreachable!()
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
            Language::None => unreachable!()
        };
        sandbox_name.to_string()
    }

    pub fn build_command(&self) -> Option<String> {
        match self {
            Language::Python
            | Language::Javascript
            | Language::Typescript => {
                eprintln!("There is no build step for {:?}", self);
                None
            }

            Language::Rust => Some("rustc main.rs -o main".into()),
            Language::Csharp => Some("fastcsc main.cs && chmod +x main.exe".into()),
            Language::C => Some("gcc main.c -o main".into()),
            Language::Cpp => Some("g++ main.cpp -o main -lstdc++".into()),
            Language::Go => Some("go build -o main main.go".into()),
            Language::Java => Some("javac main.java".into()),
            Language::Swift => Some("swiftc main.swift -o main".into()),
            Language::None => unreachable!()
        }
    }

    pub fn is_compiled(&self) -> bool {
        match self {
            Language::Python => false,
            Language::Javascript => false,
            Language::Typescript => false, // TS compiles to JS but is not executed as binary
            Language::None => unreachable!(),
            _ => true
        }
    }

    pub fn run_command(&self) -> String {
        match self {
            Language::Python => "python main.py",
            Language::Javascript => "node main.js",
            Language::Typescript => "node main.ts", // TS compiles to JS but is not executed as binary
            Language::Csharp => "dotnet main.exe",
            Language::None => unreachable!(),
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TestCaseResult {
    pub test_case_id: u64,
    pub verdict: Verdict,
    pub execution_time: u32,
    pub memory_kb: u32,
    pub stdout: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submission {
    pub id: u64,
    pub user_id: u64,
    pub problem_id: u64,
    pub language: Language,
    pub source_code: String,
    pub verdict: Option<Verdict>,
    pub message: Option<String>,
    pub execution_time: Option<u32>,
    pub memory_usage: Option<u32>,
    pub test_results: Option<Vec<TestCaseResult>>,
}

impl Submission {
    pub fn new(
        id: u64,
        user_id: u64,
        problem_id: u64,
        language: Language,
        source_code: String,
    ) -> SubmissionBuilder {
        SubmissionBuilder { id, user_id, problem_id, language, source_code, ..Default::default() }
    }

    pub fn from(submission: Submission) -> SubmissionBuilder {
        SubmissionBuilder { 
            id: submission.id, 
            user_id: submission.user_id, 
            problem_id: submission.problem_id, 
            language: submission.language, 
            source_code: submission.source_code, 
            ..Default::default() 
        }
    }
}

#[derive(Default)]
pub struct SubmissionBuilder {
    id: u64,
    user_id: u64,
    problem_id: u64,
    language: Language,
    source_code: String,
    verdict: Option<Verdict>,
    message: Option<String>,
    execution_time: Option<u32>,
    memory_usage: Option<u32>,
    judge_output: Option<String>,
    test_results: Option<Vec<TestCaseResult>>,
}

impl SubmissionBuilder {
    pub fn verdict(mut self, verdict: Verdict) -> Self {
        self.verdict = Some(verdict);
        self
    }

    pub fn message(mut self, message: String) -> Self {
        self.message = Some(message);
        self
    }

    pub fn execution_time(mut self, execution_time: u32) -> Self {
        self.execution_time = Some(execution_time);
        self
    }

    pub fn memory_usage(mut self, memory_usage: u32) -> Self {
        self.memory_usage = Some(memory_usage);
        self
    }

    pub fn judge_output(mut self, judge_output: String) -> Self {
        self.judge_output = Some(judge_output);
        self
    }

    pub fn test_results(mut self, test_results: Vec<TestCaseResult>) -> Self {
        self.test_results = Some(test_results);
        self
    }

    pub fn build(self) -> Submission {
        Submission { 
            id: self.id, 
            user_id: self.user_id, 
            problem_id: self.problem_id, 
            language: self.language, 
            source_code: self.source_code, 
            verdict: self.verdict, 
            message: self.message, 
            execution_time: self.execution_time, 
            memory_usage: self.memory_usage, 
            test_results: self.test_results 
        }
    }
}

pub struct Problem {
    pub problem_id: u64,
    pub function_name: String,
    pub parameters: Vec<(String, Option<String>)>, // parameter's  name | type
    pub return_type: String
}

pub struct TestCase {
    pub problem_id: u64,
	pub input: String, // the json version of the input 
	pub expected: String, // the json version of the output
	pub hidden: bool
}

pub struct Job {
    pub submission: Submission,
    pub problem: Problem,
    pub tests: Vec<TestCase> // test all testcases with the submitted code 
}