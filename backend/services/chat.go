package services

import (
	"Go_LLM_Web/db"
	"Go_LLM_Web/middleware"
	"Go_LLM_Web/models"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"time"

	"net/http"

	pb "Go_LLM_Web/middleware/streamservice"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"google.golang.org/grpc"
)

// 分块数据结构
type StreamChunk struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

// 元数据分块
type MetaChunk struct {
	Type      string `json:"type"`
	Title     string `json:"title"`
	SessionID string `json:"session_id"`
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
func GenerateMessage(ctx context.Context, chunkChan chan any, session_id string, title *string, fullResponse *string, stream grpc.ServerStreamingClient[pb.Response]) {
	defer close(chunkChan)

	// 发送请求
	log.Println("开始接收流式响应:")
	for {
		select {
		case <-ctx.Done():
			log.Println("完成前客户端断开连接")
			return
		default:
			resp, err := stream.Recv()
			// 流结束
			if err == io.EOF {
				*title = GenerateTitle() // 生成标题
				metadata := MetaChunk{
					Type:      "meta",
					Title:     *title,
					SessionID: session_id,
				}
				chunkChan <- metadata // 写入元数据
				log.Println("流式响应接收完成.")
				chunkChan <- "[DONE]" // 发送终止信号
				return
			}
			if err != nil {
				log.Fatalf("接收响应时发生错误: %v", err)
			}
			// 解析响应
			var respData = StreamChunk{
				Type: "text",
				Data: resp.GetData(),
			}
			fmt.Println("流式接收:", respData)
			chunkChan <- respData
		}
	}
}

// 处理消息分块
func handleChunk(w io.Writer, rawChunk any) bool {
	switch chunk := rawChunk.(type) {
	case StreamChunk, MetaChunk:
		jsonData, err := json.Marshal(chunk)
		if err != nil {
			fmt.Fprintf(w, "data: {\"type\":\"error\",\"msg\":\"JSON序列化失败\"}\n\n")
			return false
		}
		fmt.Fprintf(w, "data: %s\n\n", jsonData)
	case string:
		if chunk == "[DONE]" {
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

	// 获取请求上下文, 限时10min
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Minute)
	defer cancel()

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
	var chatSession models.ChatSession
	if user_chatMessage.Parent == "client-created-root" {
		chatSession = models.ChatSession{
			SessionID:    uuid.NewString(),
			UserID:       user_id,
			CurrentNode:  user_chatMessage.MessageID, // 当前仍是用户信息
			Mapping:      make(map[string]models.ChatMessage),
			DefaultModel: "auto",
			IsArchived:   false,
			CreatedAt:    user_chatMessage.CreatedAt, // 使用最早消息的时间点
			UpdatedAt:    time.Now(),
		}
		// 直接存入根节点
		chatSession.Mapping["client-created-root"] = models.ChatMessage{
			MessageID: "client-created-root",
			Message:   models.Message{},
			Parent:    "",
			Children:  append(make([]string, 1), user_chatMessage.MessageID),
		}
		// 添加用户消息到Session映射
		chatSession.Mapping[user_chatMessage.MessageID] = user_chatMessage
	} else {
		var err error
		// 查找当前会话
		chatSession, err = db.FindOneSession(ctx, bson.M{"user_id": user_id})
		if err != nil {
			log.Println(err)
			c.JSON(http.StatusBadRequest, gin.H{"msg": err.Error()})
			return
		}
		// 查找会话的所有消息
		chatMessages, err := db.FindMessages(ctx, bson.M{"session_id": chatSession.SessionID})
		if err != nil {
			log.Println(err)
			c.JSON(http.StatusBadRequest, gin.H{"msg": err.Error()})
			return
		}
		for _, message := range chatMessages {
			// 给上一条消息添加子节点
			if message.MessageID == user_chatMessage.Parent {
				message.Children = append(message.Children, user_chatMessage.MessageID)
				// 更新该消息到数据库
				err := db.UpdateOneMessage(ctx, bson.M{"message_id": message.MessageID}, bson.M{"children": message.Children, "created_at": time.Now()})
				if err != nil {
					log.Println("err:", err)
					c.JSON(http.StatusInternalServerError, gin.H{"msg": "消息更新失败"})
				}
				log.Println("消息更新成功.")
			}
			// 给Session添加mapping
			chatSession.Mapping[message.MessageID] = message
		}
	}

	// 存储title和ai文本
	var title string
	var fullResponse string
	var aiCreateAt = time.Now()
	var status = "in_progress"

	// 生成gRPC客户端
	var client = middleware.NewStreamClient()

	// 将Session转换为JSON
	jsonData, err := json.Marshal(chatSession)
	if err != nil {
		log.Printf("转换JSON失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "chatSession marshal failed."})
		return
	}
	// 发送请求
	fmt.Println("发送请求...")
	stream, err := client.ProcessRequest(ctx, &pb.Request{JsonData: string(jsonData)})
	if err != nil {
		log.Println("调用gRPC服务失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "gRPC 调用失败"})
		return
	}

	// 开启协程来获取生成的内容
	chunkChan := make(chan any)
	go GenerateMessage(ctx, chunkChan, chatSession.SessionID, &title, &fullResponse, stream)

	// 设置流式响应头
	SetStreamHeaders(c)
	// 流式返回分块数据
	c.Stream(func(w io.Writer) bool {
		select {
		case <-ctx.Done():
			log.Printf("客户端 %d 断开连接.", user_id)
			status = "client_abort"
			close(chunkChan) // 提前关闭channel
			return false
		case rawChunk, ok := <-chunkChan:
			if !ok {
				return false
			}
			return handleChunk(w, rawChunk)
		}
	})

	// 构建ai消息体
	if status == "in_progress" {
		status = "finished_successfully"
	}
	var ai_messageID = uuid.NewString()
	var ai_message = models.Message{
		Status: status,
		Weight: 1.0,
		Model:  model,
	}
	ai_message.Author.Role = "assistant"
	ai_message.Content.ContentType = "text"
	ai_message.Content.Parts = append(ai_message.Content.Parts, fullResponse)

	var ai_chatMessage = models.ChatMessage{
		MessageID: ai_messageID,
		SessionID: chatSession.SessionID,
		Message:   ai_message,
		Parent:    user_chatMessage.MessageID,
		Children:  make([]string, 0),
		CreatedAt: aiCreateAt,
		UpdatedAt: time.Now(),
	}

	// 更新并插入用户消息
	user_chatMessage.SessionID = chatSession.SessionID
	user_chatMessage.Children = append(user_chatMessage.Children, ai_messageID)
	user_chatMessage.UpdatedAt = time.Now()
	insertResult, err := db.ChatMessage.InsertOne(ctx, user_chatMessage)
	if err != nil {
		log.Fatal("插入失败:", err)
	}
	fmt.Printf("插入成功，ID: %v\n", insertResult.InsertedID)

	// 插入ai消息
	ai_chatMessage.CreatedAt = time.Now()
	insertResult, err = db.ChatMessage.InsertOne(ctx, ai_chatMessage)
	if err != nil {
		log.Fatal("插入失败:", err)
	}
	fmt.Printf("插入成功，ID: %v\n", insertResult.InsertedID)

	// 更新 chatSession 的 CurrentNode 并清理 Mapping
	chatSession.CurrentNode = ai_chatMessage.MessageID
	chatSession.Mapping = map[string]models.ChatMessage{
		"client-created-root": chatSession.Mapping["client-created-root"],
	}
	db.UpdateOneSession(ctx, bson.M{"session_id": chatSession.SessionID}, bson.M{
		"current_node": chatSession.CurrentNode,
		"mapping":      chatSession.Mapping,
		"created_at":   time.Now(),
	})
}
