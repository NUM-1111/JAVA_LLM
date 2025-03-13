package services

import (
	//"Go_LLM_Web/config"
	//"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	//"errors"
	"net/http"
	//"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	//"github.com/redis/go-redis/v9"
	//"gorm.io/gorm"
	//"gorm.io/gorm/clause"
)

//chats->暂时代替数据库测试
var chats = make(map[string]models.Chat)

//NewChat 创建新对话
func NewChat(c *gin.Context){
	chatID := uuid.New().String()//生成唯一 ID
	chats[chatID] = models.Chat{ID: chatID, Messages: []string{}}
	c.JSON(http.StatusOK,gin.H{"chat_id":chatID})
}

//GetChat 获取对话内容
func GetChat(c *gin.Context){
	chatID := c.Param("id")
	if chat,exists := chats[chatID];exists{
		c.JSON(http.StatusOK,chat)
	}else {
		c.JSON(http.StatusNotFound,gin.H{"error":"Chat not found"})
	}
}