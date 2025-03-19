package services

import (
	//"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"fmt"

	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

/*
查询session会话
*/
func QueryConversation(c *gin.Context) {
	// 从上下文中获取session信息（由中间件 AuthSession 提供）
	session, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Session not found"})
		return
	}

	// 将 session 转换为具体的模型类型
	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session"})
		return
	}

	// 构造查询条件，按照 user_id 查询该用户的所有会话
	query := bson.M{"user_id": s.UserID}
	fmt.Println(query)

	// 调用数据库查询函数
	sessions, err := db.FindSessions(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
		return
	}
	fmt.Println(sessions)

	// 返回数据给前端
	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}
