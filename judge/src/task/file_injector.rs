use crate::models::{Language, Problem, TestCase};
use uuid::Uuid;

pub struct FileInjector;

impl FileInjector {
    pub fn inject(language: &Language, problem: &Problem, user_code: &mut str, uuid: &Uuid) -> String {
        match language {
            Language::Python => todo!(),
            Language::Rust => Self::inject_rust(problem, user_code, uuid),
            Language::Csharp => todo!(),
            Language::C => todo!(),
            Language::Cpp => todo!(),
            Language::Javascript => todo!(),
            Language::Typescript => todo!(),
            Language::Go => todo!(),
            Language::Java => todo!(),
            Language::Swift => todo!(),
            Language::None => todo!(),
        }
    }

    pub fn inject_rust(problem: &Problem, user_code: &mut str, uuid: &Uuid) -> String {
        let function_name = &problem.function_name; // "sum"
        let params: String = problem.parameters.iter()
            .map(|p| format!("{}", p.0))  // Changed {:?} to {}
            .collect::<Vec<_>>()
            .join(", ");

        // Generate stdin parsing based on parameter types
        let mut stdin_parsing = String::new();
        let params_vec: Vec<&str> = params.split(", ").collect();
        
        // Read from stdin and parse
        stdin_parsing.push_str("let stdin = std::io::stdin();\n");
        stdin_parsing.push_str("let line = stdin.lock().lines().next().unwrap().unwrap();\n");
        
        if params_vec.len() == 1 {
            // Single parameter
            stdin_parsing.push_str(&format!(
                "let {} = line.trim().parse().expect(\"Failed to parse input\");\n",
                params_vec[0]
            ));
        } else {
            // Multiple parameters - split by whitespace
            stdin_parsing.push_str("    let parts: Vec<&str> = line.split_whitespace().collect();\n");
            for (i, param) in params_vec.iter().enumerate() {
                stdin_parsing.push_str(&format!(
                    "let {} = parts[{}].parse().expect(\"Failed to parse parameter {}\");\n",
                    param, i, i
                ));
            }
        }

        let return_type = &problem.return_type;

        let template = format!(
            r#"
            use std::io::{{self, BufRead}};

            struct Solution;

            {user_code}

            fn main() {{
                {stdin_parsing}
                let result: {return_type} = Solution::{function_name}({params});
                println!("{uuid} {{}}", result);
            }}
            "#
        );
        
        println!("template {}", template);
        template
    }
}