package services

import (
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"time"

	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
)

// 定义分块数据结构
type StreamChunk struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

// 向python服务请求生成title
func GenerateTitle() string {
	return "New chat"
}

// 添加流式响应头
func SetStreamHeaders(c *gin.Context) {
	headers := c.Writer.Header()
	headers.Set("Content-Type", "text/event-stream")
	headers.Set("Cache-Control", "no-cache")
	headers.Set("Connection", "keep-alive")
	headers.Set("Transfer-Encoding", "chunked")
}

// 验证请求的模型
func getValidModel(model string) (string, bool) {
	// 模型验证逻辑
	validModels := map[string]bool{
		"auto":        true,
		"DeepSeek-R1": true,
		"QwQ-32B":     true,
	}
	if !validModels[model] {
		return "", false
	} else if model == "auto" {
		return "DeepSeek-R1", true
	}
	return model, true
}

// 向python服务请求生成回答
func GenerateMessage(ctx context.Context, model string, chunkChan chan any, fullResponse *string) {
	defer close(chunkChan)

	for i := 0; i < 5; i++ {
		select {
		case <-ctx.Done():
			log.Println("生成中断: 客户端断开连接")
			return
		default:
			time.Sleep(500 * time.Millisecond)
			data := fmt.Sprintf("这是第 %d 块数据", i+1)
			*fullResponse += data
			chunkChan <- StreamChunk{
				Type: "text",
				Data: data,
			}
		}
	}
	select {
	case <-ctx.Done():
		log.Println("完成前客户端断开连接")
	case chunkChan <- "[DONE]":
	}
}

// 处理消息分块
func handleChunk(w io.Writer, rawChunk any, session_id string, title *string) bool {
	switch chunk := rawChunk.(type) {
	case StreamChunk:
		jsonData, err := json.Marshal(chunk)
		if err != nil {
			fmt.Fprintf(w, "data: {\"type\":\"error\",\"data\":\"JSON序列化失败\"}\n\n")
			return false
		}
		fmt.Fprintf(w, "data: %s\n\n", jsonData)
	case string:
		if chunk == "[DONE]" {
			// 写入元数据
			*title = GenerateTitle() // 生成标题
			jsonData, err := json.Marshal(gin.H{"type": "meta", "data": session_id, "title": *title})
			if err != nil {
				fmt.Fprintf(w, "data: {\"type\":\"error\",\"data\":\"JSON序列化失败\"}\n\n")
				return false
			}
			fmt.Fprintf(w, "data: %s\n\n", jsonData)
			fmt.Fprintf(w, "data: [DONE]\n\n")
			return false // 终止流
		}
	}
	return true
}

// 接受前端来自用户的新消息
// 建立流式传输, 返回ai生成内容
func HandleNewMessage(c *gin.Context) {
	var chatRequest models.ChatRequest
	if err := c.ShouldBindJSON(&chatRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数类型异常,注册失败."})
		return
	}

	// 获取用户session
	session, exist := c.Get("session")
	if !exist {
		c.JSON(http.StatusBadRequest, gin.H{"type": "error", "msg": "session获取失败"})
	}
	// 判断使用的模型
	var model, ok = getValidModel(chatRequest.Model)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"type": "error", "msg": "unknown model"})
		return
	}
	// 获取请求上下文
	ctx := c.Request.Context()

	user_id := session.(*models.Session).UserID // 获取用户ID

	// 构建用户消息体
	var user_chatMessage = models.ChatMessage{
		MessageID: chatRequest.MessageID,
		Message:   chatRequest.Messages[0],
		Parent:    chatRequest.ParentMessageID,
		CreatedAt: chatRequest.CreatedAt,
		UpdatedAt: time.Now(),
		Children:  make([]string, 0),
	}

	// 如果是新对话,则创建一个ChatSession
	var ai_message_id = uuid.NewString()
	var chatSession models.ChatSession
	if chatRequest.ParentMessageID == "client-created-root" {
		chatSession = models.ChatSession{
			SessionID:    uuid.NewString(),
			UserID:       user_id,
			CurrentNode:  chatRequest.MessageID, // 当前仍是用户信息
			DefaultModel: "auto",
			IsArchived:   false,
			CreatedAt:    chatRequest.CreatedAt, // 使用最早消息的时间点
			UpdatedAt:    time.Now(),
		}
		// 直接存入根节点
		chatSession.Mapping["client-created-root"] = models.ChatMessage{
			MessageID: "client-created-root",
			Message:   models.Message{},
			Parent:    "",
			Children:  append(make([]string, 1), chatRequest.MessageID),
		}
		// 添加用户消息到Session映射
		chatSession.Mapping[chatRequest.MessageID] = user_chatMessage
		// 更新当前Session的根节点
		//err:= db.UpdateOneSession(ctx,bson.M{"session_id": chatSession.SessionID},bson.M{"mapping":chatSession.Mapping})
	} else {
		var err error
		// 查找当前会话
		chatSession, err = db.FindOneSession(ctx, bson.M{"user_id": user_id})
		if err != nil {
			log.Println(err)
		}
		// 查找会话的所有消息
		chatMessages, err := db.FindMessages(ctx, bson.M{"session_id": chatSession.SessionID})
		if err != nil {
			log.Println(err)
		}
		for _, message := range chatMessages {
			// 给上一条消息添加子节点
			if message.MessageID == user_chatMessage.Parent {
				message.Children = append(message.Children, user_chatMessage.MessageID)
				err := db.UpdateOneMessage(ctx, bson.M{"message_id": message.MessageID}, bson.M{"children": message.Children})
				if err != nil {
					log.Println("err:", err)
					c.JSON(http.StatusInternalServerError, gin.H{"msg": "消息更新失败"})
				}
				log.Println("消息更新成功.")
			}
			chatSession.Mapping[message.MessageID] = message
		}
	}

	// 获取id,title
	var title string
	var fullResponse string

	// 设置流式响应头
	SetStreamHeaders(c)

	// 开启协程来获取生成的内容
	chunkChan := make(chan any)
	go GenerateMessage(ctx, model, chunkChan, &fullResponse)
	// 创建ai Message
	var ai_message = models.Message{
		Status: "in_progress",
		Weight: 1.0,
		Model:  model,
	}
	// 流式返回分块数据
	c.Stream(func(w io.Writer) bool {
		select {
		case <-ctx.Done():
			log.Printf("客户端 %d 断开连接.", user_id)
			ai_message.Status = "client_abort"
			return false
		case rawChunk, ok := <-chunkChan:
			if !ok {
				return false
			}
			return handleChunk(w, rawChunk, chatSession.SessionID, &title)
		}
	})

	// 构建ai消息体
	if ai_message.Status == "in_progress" {
		ai_message.Status = "finished_successfully"
	}
	ai_message.Author.Role = "assistant"
	ai_message.Content.ContentType = "text"
	ai_message.Content.Parts = append(ai_message.Content.Parts, fullResponse)

	var ai_chatMessage = models.ChatMessage{
		MessageID: ai_message_id,
		SessionID: chatRequest.MessageID,
		Message:   ai_message,
		Parent:    chatRequest.MessageID,
		Children:  make([]string, 0),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// 插入用户消息
	insertResult, err := db.ChatSession.InsertOne(ctx, user_chatMessage)
	if err != nil {
		log.Fatal("插入失败:", err)
	}
	fmt.Printf("插入成功，ID: %v\n", insertResult.InsertedID)
	// 插入ai消息
	insertResult, err = db.ChatSession.InsertOne(ctx, ai_chatMessage)
	if err != nil {
		log.Fatal("插入失败:", err)
	}
	fmt.Printf("插入成功，ID: %v\n", insertResult.InsertedID)
}
