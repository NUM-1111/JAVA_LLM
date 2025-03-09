package config

import (
	"github.com/redis/go-redis/v9"
)

var (
	//Postgre

	// Redis
	RedisOpt = redis.Options{
		Addr:     "localhost:6379", // Redis 服务器地址
		Password: "",               // Redis 认证密码（如果没有，可留空）
		DB:       0,                // 使用默认数据库
	}
)
