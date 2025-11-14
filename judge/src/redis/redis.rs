use redis::{AsyncCommands, RedisResult, aio::ConnectionManager};
use futures_util::StreamExt;

#[derive(Clone)]
pub struct RedisService {
    pub client: redis::Client,
    pub manager: ConnectionManager,
}

impl RedisService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let redis_client = redis::Client::open("redis://redis:6379")?;
        Ok(Self {
            client: redis_client.clone(),
            manager: ConnectionManager::new(redis_client).await?,
        })
    }

    pub async fn publish(&self, channel: &str, message: &str) -> RedisResult<()> {
        // Get a connection from the manager for publishing
        let mut conn = self.manager.clone();
        let _: () = conn.publish(channel, message).await?;
        Ok(())
    }

    pub async fn subscribe(&self, channels: &[&str]) -> RedisResult<redis::aio::PubSub> {
        // Get a dedicated connection for subscription
        let mut pubsub_conn = self.client.get_async_pubsub().await?;

        // Subscribe to channels
        pubsub_conn.subscribe(channels).await?;

        Ok(pubsub_conn)
    }

    pub async fn clear_all(&mut self) -> RedisResult<()> {
        let _: () = self.manager.flushall().await?;
        Ok(())
    }

    pub async fn listen_pubstream<F: AsyncFnMut() -> ()>(&mut self, channels: &[&str], mut handle_jobs: F) {
        let pubsub_conn = self.subscribe(channels);
        let mut pubsub = pubsub_conn.await.unwrap();
        let pubsub_stream = &mut pubsub.on_message();
        while let Some(_msg) = pubsub_stream.next().await {
            handle_jobs().await;
        }
    }

    pub async fn fetch_job(&mut self) -> RedisResult<Option<String>> {
        Ok(self.manager.lpop("queue", None).await?)
    }
}
