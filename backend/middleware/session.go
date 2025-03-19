package middleware

import (
	"Go_LLM_Web/db"     // 数据库操作包
	"Go_LLM_Web/models" // 数据模型
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetSession 根据 session_id 获取会话信息
func GetSession(sessionID string) (*models.Session, error) {
	var session models.Session
	// 查询数据库，查找匹配的 session_id
	if err := db.DB.Where("session_id = ?", sessionID).First(&session).Error; err != nil {
		return nil, err // 查询失败，返回错误
	}
	// 检查会话是否有效（未失效 && 过期时间未到）
	if !session.IsValid || session.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("session expired")
	}
	return &session, nil // 返回会话信息
}

// AuthSession 认证中间件，验证 session_id 并存入上下文
func AuthSession(c *gin.Context) {
	// 从 Cookie 中获取 session_id
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" || len(authHeader) < 8 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权，缺少 Authorization"})
		c.Abort()
		return
	}

	// 调用 GetSession 获取 session 信息
	session, err := GetSession(authHeader)
	if err != nil {
		// Session 不存在或过期，返回 401 未授权
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session or session expired"})
		c.Abort()
		return
	}

	// 将 session 存入 Gin 上下文，供后续处理使用
	c.Set("session", session)
	// 继续执行后续逻辑
	c.Next()
}
