package config

import (
	"fmt"
	"time"

	"github.com/bwmarrin/snowflake"
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

	// snowFlake
	MachineID = 0
	SFNode    *snowflake.Node

	// 邮箱验证
	EmailPattern = `^[a-zA-Z0-9._%+-]+@hrbeu.edu.cn`
)

func init() {
	// Create a new Node with a Node number of 1
	var err error
	SFNode, err = snowflake.NewNode(int64(MachineID))
	if err != nil {
		fmt.Println(err)
		return
	}
}
