package config

import (
	"fmt"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/redis/go-redis/v9"
)

var (
	//Postgres
	Host          = "localhost"
	PG_user       = "postgres"
	PG_password   = "postgres"
	PG_dbname     = "user_info"
	PG_dsn        = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=5432 sslmode=disable", Host, PG_user, PG_password, PG_dbname)
	SessionExpire = 7 * 24 * time.Hour // 7天过期

	// Redis
	RedisOpt = redis.Options{
		Addr:     "localhost:6379", // Redis 服务器地址
		Password: "",               // Redis 认证密码（如果没有，可留空）
		DB:       0,                // 使用默认数据库
	}

	// Session auth
	SessionOpt = sessions.Options{
		MaxAge: 3600, // 1 小时过期
		Path:   "/",
	}

	// 邮箱验证
	EmailPattern = `^[a-zA-Z0-9._%+-]+@hrbeu.edu.cn`
)
