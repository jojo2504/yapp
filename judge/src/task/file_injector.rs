use crate::models::{Problem, TestCase};
use uuid::Uuid;

pub struct FileInjector;

impl FileInjector {
    pub fn inject_rust(problem: &Problem, tests: &Vec<TestCase>, user_code: &mut str, uuid: &Uuid) -> String {
        let function_name = &problem.function_name; // "sum"
        let params: String = problem.parameters.iter()
            .map(|p| format!("{}", p.0))  // Changed {:?} to {}
            .collect::<Vec<_>>()
            .join(", ");

        let inputs: Vec<String> = tests.iter().map(|x| x.input.replace(' ', ",")).collect();
        println!("inputs {:?}", inputs);
        
        let mut s_input: String = String::from("[(");
        s_input.push_str(&inputs.join("), ("));
        s_input.push_str(")]");

        let mut var_init: String = "".to_string();
        let params_name: Vec<&str> = params.split(", ").collect(); 
        println!("params_name : {:?}", params_name);

        println!("params_name len = {}", params_name.len());
        
        for i in 0..problem.parameters.len() {
            var_init.push_str(&format!("let {} = input.{}; ", params_name[i], i));
            println!("{}", var_init);
        }

        let return_type = &problem.return_type;

        let template = format!(
        r#"
        use std::any::Any;

        struct Solution;

        {user_code}

        fn main() {{
            let inputs = {s_input};
            for input in &inputs {{
                {var_init}
                let result = Solution::{function_name}({params});
                if (&result as &dyn Any).is::<{return_type}>() {{
                    println!("{uuid} {{:?}}", result);
                }}
            }}
        }}
        "#
        );
        
        println!("{}", template);
        template
    }
}