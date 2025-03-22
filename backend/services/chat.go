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
	"strings"
	"time"

	"net/http"

	pb "Go_LLM_Web/middleware/streamservice"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"google.golang.org/grpc"
)

// 分块数据结构
type StreamChunk struct {
	Type    string `json:"type"`
	Message string `json:"message,omitempty"`
	Content string `json:"content,omitempty"`
}

// 元数据分块
type MetaChunk struct {
	Type           string `json:"type"`
	Title          string `json:"title"`
	ConversationID string `json:"conversation_id"`
}

// gRPC接口数据格式
type GRPCData struct {
	ConversationID string `json:"conversation_id"`
	CurrentNode    string `json:"current_node"`
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
		"QwQ32B":      true,
	}
	if !validModels[model] {
		return "", false
	} else if model == "auto" {
		return "QwQ32B", true
	}
	return model, true
}

// 向python服务请求生成回答
func GenerateMessage(ctx context.Context, chunkChan chan any, conversation_id string, stream grpc.ServerStreamingClient[pb.Response]) {
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
				log.Println("流式响应接收完成.")
				return
			} else if err != nil {
				log.Printf("gRPC 读取失败: %v", err)
				chunkChan <- "data: {\"type\":\"error\",\"msg\":\"gRPC 服务错误\"}\n\n"
				return
			}
			// 解析响应
			var rawData = resp.GetData()
			if strings.TrimSpace(rawData) == "[DONE]" {
				log.Println("流式响应接收完成.")
				chunkChan <- "[DONE]" // 写入终止信号
				return
			}
			fmt.Println("流式响应:", rawData)
			chunkChan <- rawData
		}
	}
}

// 处理消息分块
func handleChunk(w io.Writer, rawChunk any) bool {
	switch chunk := rawChunk.(type) {
	case MetaChunk:
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
		return
	}
	// 判断使用的模型
	// var model, ok = getValidModel(chatRequest.Model)
	// if !ok {
	// 	c.JSON(http.StatusBadRequest, gin.H{"type": "error", "msg": "unknown model"})
	// 	return
	// }

	// 获取请求上下文, 限时10min
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Minute)
	defer cancel()

	user_id := session.(*models.Session).UserID // 获取用户ID

	// 构建用户消息体
	var user_chatMessage = models.ChatMessage{
		MessageID:      chatRequest.MessageID,
		ConversationID: chatRequest.ConversationID,
		Message:        chatRequest.Message,
		Parent:         chatRequest.Parent,
		CreatedAt:      chatRequest.CreatedAt,
		UpdatedAt:      time.Now(),
		Children:       make([]string, 0),
	}

	// 如果是新对话,则创建一个Conversation
	var conversation models.Conversation
	if user_chatMessage.Parent == "client-created-root" {
		conversation = models.Conversation{
			ConversationID: user_chatMessage.ConversationID,
			UserID:         user_id,
			Title:          "New Chat",
			CurrentNode:    user_chatMessage.MessageID, // 当前仍是用户信息
			DefaultModel:   "auto",
			IsArchived:     false,                      // 新会话默认不会归档
			CreatedAt:      user_chatMessage.CreatedAt, // 使用最早消息的时间点
			UpdatedAt:      time.Now(),
		}
		insertResult, err := db.Conversation.InsertOne(ctx, conversation)
		if err != nil {
			log.Println("插入失败:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "会话插入失败", "err": err.Error()})
			return
		}
		log.Printf("插入成功，ID: %v\n", insertResult.InsertedID)
	} else {
		// 判断是否存在conversation_id
		if user_chatMessage.ConversationID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"msg": "未提供conversation_id,请求失败"})
			return
		}
		var err error
		// 查找conversation_id对应会话
		conversation, err = db.FindOneConversation(ctx, bson.M{"conversation_id": user_chatMessage.ConversationID})
		if err != nil {
			log.Println(err)
			c.JSON(http.StatusBadRequest, gin.H{"msg": "会话查询失败", "err": err.Error()})
			return
		}
		// 更新用户消息的父节点
		err = db.UpdateOneMessage(ctx, bson.M{"message_id": user_chatMessage.Parent},
			bson.M{
				"$push": bson.M{"children": user_chatMessage.MessageID},
				"$set":  bson.M{"updated_at": time.Now()},
			})
		if err != nil {
			log.Println("err:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "消息更新失败", "err": err.Error()})
			return
		}
		log.Printf("父节点%s 更新成功", user_chatMessage.Parent)
		// 更新conversation的当前节点
		conversation.CurrentNode = user_chatMessage.MessageID
		err = db.UpdateOneConversation(ctx, bson.M{"conversation_id": conversation.ConversationID}, bson.M{
			"$set": bson.M{"current_node": conversation.CurrentNode, "updated_at": time.Now()},
		})
		if err != nil {
			log.Println("err:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "会话更新失败", "err": err.Error()})
			return
		}
		log.Printf("会话%s 更新成功", conversation.ConversationID)
	}
	// 更新并插入用户消息
	user_chatMessage.ConversationID = conversation.ConversationID
	user_chatMessage.UpdatedAt = time.Now()
	insertResult, err := db.ChatMessage.InsertOne(ctx, user_chatMessage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "消息插入失败", "err": err.Error()})
		return
	}
	fmt.Printf("插入成功，ID: %v\n", insertResult.InsertedID)

	// 生成gRPC客户端
	var client = middleware.NewStreamClient()

	// 将Conversation转换为JSON
	jsonData, err := json.Marshal(GRPCData{
		ConversationID: conversation.ConversationID,
		CurrentNode:    conversation.CurrentNode,
	})
	if err != nil {
		log.Printf("转换JSON失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "conversation marshal failed."})
		return
	}
	// 发送请求
	fmt.Println("发送请求至gRPC...")
	stream, err := client.ProcessRequest(ctx, &pb.Request{JsonData: string(jsonData)})
	if err != nil {
		log.Println("调用gRPC服务失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "gRPC 调用失败"})
		return
	}

	// 开启协程来获取生成的内容
	chunkChan := make(chan any, 1)
	metadata := MetaChunk{
		Type:           "meta",
		ConversationID: conversation.ConversationID,
	}
	chunkChan <- metadata // 写入元数据
	go GenerateMessage(ctx, chunkChan, conversation.ConversationID, stream)

	// 设置流式响应头
	SetStreamHeaders(c)
	// 流式返回分块数据
	c.Stream(func(w io.Writer) bool {
		select {
		case <-ctx.Done():
			log.Printf("客户端 %d 断开连接.", user_id)
			close(chunkChan) // 提前关闭channel
			return false
		case rawChunk, ok := <-chunkChan:
			if !ok {
				return false
			}
			return handleChunk(w, rawChunk)
		}
	})

}
