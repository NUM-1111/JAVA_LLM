package db

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

var CTX = context.Background()
var Redis *redis.Client

func InitRedis(opt *redis.Options) {
	Redis = redis.NewClient(opt)

	// 测试连接
	_, err := Redis.Ping(CTX).Result()
	if err != nil {
		log.Fatalf("无法连接到 Redis: %v", err)
	}
	fmt.Println("[Redis] service is running.")
}

// 关闭 Redis 连接
func CloseRedis() {
	err := Redis.Close()
	if err != nil {
		log.Fatalf("关闭 Redis 连接失败: %v", err)
	}
	fmt.Println("[Redis] service shutdown.")
}
