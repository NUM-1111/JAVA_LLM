package services

import (
	//"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"

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
		c.JSON(http.StatusUnauthorized, gin.H{"err": "Session not found"})
		return
	}

	// 将 session 转换为具体的模型类型
	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "Invalid session"})
		return
	}

	// 构造查询条件，按照 user_id 查询该用户的所有会话
	query := bson.M{"user_id": s.UserID}

	// 调用数据库查询函数
	sessions, err := db.FindConversations(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"err": "数据库查询失败"})
		return
	}

	// 返回数据给前端
	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

/*
删除所有会话
*/
func DeleteAllConversations(c *gin.Context) {
	// 从上下文中获取session信息（由中间件 AuthSession 提供）
	session, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "Session not found"})
		return
	}

	// 将 session 转换为具体的模型类型
	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "Invalid session"})
		return
	}

	// 构造查询条件，按照 user_id 查询该用户的所有会话
	query := bson.M{"user_id": s.UserID}

	// 调用数据库删除函数
	err := db.DeleteConversation(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"err": "数据库删除失败"})
		return
	}

	// 返回数据给前端
	c.JSON(http.StatusOK, gin.H{"msg": "删除聊天记录成功"})
}