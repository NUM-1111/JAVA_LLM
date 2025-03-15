package services

import (
	"Go_LLM_Web/models"

	"net/http"

	"github.com/gin-gonic/gin"
)

// 接受前端来自用户的新消息
// 建立流式传输, 返回ai生成内容
func HandleNewMessage(c *gin.Context) {
	var chatRequest models.ChatRequest
	if err := c.ShouldBindJSON(&chatRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数类型异常,注册失败."})
		return
	}

}
