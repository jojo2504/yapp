package redisService

import (
    "backend/api/types/submission"
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

// ErrKeyMissing is returned when a Redis key lookup finds no value.
var ErrKeyMissing = errors.New("redis: key not found")

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
    if err := rs.rdb.LPush(rs.Context, "queue", serialized).Err(); err != nil {
        fmt.Println("LPush failed:", err)
        return
    }
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

// IncrCounter atomically increments the integer at `key` and returns the new value.
// Used by the playground to mint unique submission IDs without touching the DB.
func IncrCounter(rs *RedisService, key string) (int64, error) {
    return rs.rdb.Incr(rs.Context, key).Result()
}

// SetWithTTL writes `value` under `key` with the given TTL.
func SetWithTTL(rs *RedisService, key string, value string, ttl time.Duration) error {
    return rs.rdb.Set(rs.Context, key, value, ttl).Err()
}

// GetKey reads the value at `key`. Returns ErrKeyMissing if no such key exists.
func GetKey(rs *RedisService, key string) (string, error) {
    v, err := rs.rdb.Get(rs.Context, key).Result()
    if errors.Is(err, redis.Nil) {
        return "", ErrKeyMissing
    }
    return v, err
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
