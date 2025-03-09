package middleware

import (
	"Go_LLM_Web/config"
	"log"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/redis"
	"github.com/gin-gonic/gin"
)

func AuthSession() gin.HandlerFunc {
	// 初始化 Redis 作为 Session 存储
	store, err := redis.NewStore(10, "tcp", "localhost:6379", "", []byte("secret"))
	if err != nil {
		log.Fatal("无法连接 Redis:", err)
	}

	// 设置 Session 过期时间
	store.Options(config.SessionOpt)

	// 返回 Session 中间件
	return sessions.Sessions("auth_session", store)
}
