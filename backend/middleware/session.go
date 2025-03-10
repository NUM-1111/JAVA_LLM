package middleware

import (
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// 根据 session_id 获取会话信息
func GetSession(sessionID string) (*models.Session, error) {
	var session models.Session
	if err := db.DB.Where("session_id = ?", sessionID).First(&session).Error; err != nil {
		return nil, err
	}
	// 检查会话是否过期
	if !session.IsValid || session.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("session expired")
	}
	return &session, nil
}

func AuthSession(c *gin.Context) {
	session_id, err := c.Cookie("session_id")
	if err != nil {
		// 如果没有找到 session_id，返回错误
		c.JSON(http.StatusUnauthorized, gin.H{"msg": "authorization failed."})
		return
	}

	session, err := GetSession(session_id)
	if err != nil {
		// 如果没有找到会话或会话已过期，返回错误
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session or session expired"})
		c.Abort()
		return
	}
	c.Set("session", session)
	c.Next()
}
