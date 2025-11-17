package main

import (
	"backend/internal/api/judge"
	"backend/internal/api/submit"
	"backend/internal/redisService"
	"context"

	"github.com/gin-gonic/gin"
)

func SetupRouter(redis redisService.RedisService) *gin.Engine {
	r := gin.Default()

	submit.RegisterRoutes(r, redis)
	judge.RegisterRoutes(r)

	return r
}

func main() {
	var redis = redisService.RedisService{Context: context.Background()}
	redisService.NewClient(&redis, "redis:6379", "", 0)
	println("init redis!")

	router := SetupRouter(redis)
	router.Run("0.0.0.0:8080") // start server once
}
