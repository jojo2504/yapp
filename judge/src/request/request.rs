use crate::models::Submission;
use reqwest::Client;

#[derive(Default)]
pub struct ReqwestClient {
    client: Client
}

impl ReqwestClient {
    // send a payload to a address
    pub fn send_submission(&self, addr: &str, submission: Submission) -> Result<(), ()> {
        let url = format!("{}{}", addr, self.parse_submission(submission));
        todo!()
    }

    fn parse_submission(&self, submission: Submission) -> String {
        todo!()
    }
}