package services

import (
	//"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"fmt"
	"log"
	"time"

	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

// 查询一个会话
func QueryOneConversation(c *gin.Context) {
	// 从上下文中获取session信息（由中间件 AuthSession 提供）
	_, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "无效的登录凭证"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "无效的会话id"})
		return
	}
	// 构造查询条件，按照 user_id 查询该用户的所有会话
	query := bson.M{"conversation_id": id}

	// 调用数据库查询函数
	conversation, err := db.FindOneConversation(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库查询失败!", "err": err.Error()})
		return
	}

	// 返回数据给前端
	c.JSON(http.StatusOK, gin.H{"msg": "请求成功", "data": conversation})
}

/*
查询conversation会话
*/
func QueryConversations(c *gin.Context) {
	// 从上下文中获取session信息（由中间件 AuthSession 提供）
	session, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "无效的登录凭证"})
		return
	}

	// 将 session 转换为具体的模型类型
	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "身份认证失败"})
		return
	}

	// 构造查询条件，按照 user_id 查询该用户的所有会话
	query := bson.M{"user_id": s.UserID}

	// 调用数据库查询函数
	conversations, err := db.FindConversations(c.Request.Context(), query, bson.D{{Key: "updated_at", Value: -1}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库查询失败!", "err": err.Error()})
		return
	}

	// 返回数据给前端
	c.JSON(http.StatusOK, gin.H{"sessions": conversations})
}

/*
查询会话的历史消息
*/
func QueryMessages(c *gin.Context) {
	var reqData struct {
		ConversationID string `json:"conversation_id"`
	}
	if err := c.ShouldBindJSON(&reqData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数格式异常,未获取到conversation_id."})
		return
	}
	// 构造查询条件，按照 user_id 查询该用户的所有会话
	query := bson.M{"conversation_id": reqData.ConversationID}

	// 调用数据库查询函数
	messages, err := db.FindMessages(c.Request.Context(), query, bson.D{{Key: "created_at", Value: -1}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库查询失败!", "err": err.Error()})
		return
	}
	var currentId string
	if len(messages) >= 1 {
		currentId = messages[0].MessageID
	}
	// 返回数据给前端
	c.JSON(http.StatusOK, gin.H{"current_id": currentId, "messages": messages})
}

/*
删除单个会话
*/
func DeleteConversation(c *gin.Context) {
	var reqData struct {
		ConversationID string `json:"conversation_id"`
	}
	if err := c.ShouldBindJSON(&reqData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数格式异常,未获取到conversation_id."})
		return
	}
	// 构造查询条件，按照conversion_id删除该会话
	query := bson.M{"conversation_id": reqData.ConversationID}

	// 调用数据库删除函数
	err := db.DeleteOneConversation(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"err": "数据库删除失败"})
		return
	}

	// 返回数据给前端
	c.JSON(http.StatusOK, gin.H{"msg": "删除聊天记录成功"})
}

/*
删除所有会话(先删除Conversion中的message_id，再删除Conversation)
*/
func DeleteAllConversations(c *gin.Context) {
	// 从上下文中获取session信息（由中间件 AuthSession 提供）
	session, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "无效的登录凭证"})
		return
	}

	// 将 session 转换为具体的模型类型
	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "身份认证失败"})
		return
	}

	// 构造查询条件，按照 user_id 查询该用户的所有会话
	query := bson.M{"user_id": s.UserID}

	// 调用数据库删除函数
	err := db.DeleteConversations(c.Request.Context(), query)
	fmt.Println(err)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"err": "数据库删除失败"})
		return
	}

	// 返回数据给前端
	c.JSON(http.StatusOK, gin.H{"msg": "删除聊天记录成功"})
}

/*
重命名接口
*/
func RenameConversation(c *gin.Context) {
	var reqData struct {
		ConversationID string `json:"conversation_id"`
		Title          string `json:"title"`
	}
	if err := c.ShouldBindJSON(&reqData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数格式异常,未获取到conversation_id."})
		return
	}
	// 构造查询条件，按照conversion_id修改该会话的title
	query := bson.M{"conversation_id": reqData.ConversationID}
	update := bson.M{"$set": bson.M{"title": reqData.Title, "updated_at": time.Now()}}

	// 调用数据库更新函数
	err := db.UpdateOneConversation(c.Request.Context(), query, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"err": "数据库更新失败"})
		return
	}

	// 返回数据给前端
	c.JSON(http.StatusOK, gin.H{"msg": "修改聊天记录成功"})
}

// 查询最新的message_id
func QueryMessageId(c *gin.Context) {
	var reqData struct {
		ConversationID string `json:"conversation_id"` // 关联会话
	}
	if err := c.ShouldBindJSON(&reqData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "-1", "msg": "参数格式异常!"})
		return
	}
	var ctx = c.Request.Context()
	result, err := db.FindOneConversation(ctx, bson.M{"conversation_id": reqData.ConversationID})
	if err != nil {
		log.Println("conversation查询出错! err:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"code": "-1", "msg": "最新节点id查询时出错!"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": "0", "current_id": result.CurrentNode})
}
