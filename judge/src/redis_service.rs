use redis::{AsyncCommands, PubSub, RedisResult, aio::ConnectionManager};

#[derive(Clone)]
pub struct RedisService {
    pub client: redis::Client,
    pub manager: ConnectionManager
}

impl RedisService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let redis_client = redis::Client::open("redis://redis:6379")?;
        Ok(Self {
            client: redis_client.clone(),
            manager: ConnectionManager::new(redis_client).await?
        })
    }

    pub async fn publish(&self, channel: &str, message: &str) -> RedisResult<()> {
        // Get a connection from the manager for publishing
        let mut conn = self.manager.clone();
        conn.publish(channel, message).await
    }

    pub async fn subscribe(&self, channels: &[&str]) -> RedisResult<redis::aio::PubSub> {
        // Get a dedicated connection for subscription
        let mut pubsub_conn = self.client.get_async_pubsub().await?;
        
        // Subscribe to channels
        pubsub_conn.subscribe(channels).await?;
        
        Ok(pubsub_conn)
    }
}