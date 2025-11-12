package redisService

import (
	"backend/api/types/submission"
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type RedisService struct {
	Context context.Context // context.Background()
	rdb     *redis.Client
}

func NewClient(rs *RedisService, addr string, password string, db int) {
	rs.rdb = redis.NewClient(&redis.Options{
		Addr:     addr,     // "localhost:6379"
		Password: password, // no password set
		DB:       db,       // use default DB
	})
}

func AddSubmission(rs *RedisService, submission submission.Submission) {
	serialized, err := json.Marshal(submission)
	if err != nil {
		panic(err)
	}

	println("trying to lpush")
	rs.rdb.LPush(rs.Context, "queue", serialized)
	Publish(rs, "queue", "pushed new submission")
	VerifyQueue(rs)
}

func Publish(rs *RedisService, channel string, message string) {
	err := rs.rdb.Publish(rs.Context, channel, message).Err()
	if err != nil {
		fmt.Println("Publish failed:", err)
	} else {
		fmt.Println("Published:", message)
	}
}

func VerifyQueue(rs *RedisService) {
	length, err := rs.rdb.LLen(rs.Context, "queue").Result()
	if err != nil {
		fmt.Println("Error checking queue length:", err)
		return
	}

	fmt.Printf("Queue length: %d\n", length)

	if length > 0 {
		value, err := rs.rdb.LIndex(rs.Context, "queue", 0).Result()
		if err != nil {
			fmt.Println("Error reading queue item:", err)
			return
		}
		fmt.Println("First item in queue (raw JSON):")
		fmt.Println(value)

		var sub submission.Submission
		if err := json.Unmarshal([]byte(value), &sub); err != nil {
			fmt.Println("Error decoding JSON:", err)
			return
		}
		fmt.Printf("Decoded submission: %+v\n", sub)
	}
}
