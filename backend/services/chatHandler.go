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
	"strconv"
	"sync"

	"time"

	"net/http"

	pb "Go_LLM_Web/middleware/streamservice"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"google.golang.org/grpc"
	"gorm.io/gorm"
)

// 分块数据结构
type StreamChunk struct {
	Type           string `json:"type"`
	Content        string `json:"content,omitempty"`
	Message        string `json:"message,omitempty"`
	ConversationID string `json:"conversation_id,omitempty"`
}

// gRPC接口数据格式
type GRPCData struct {
	ConversationID string   `json:"conversation_id"`
	CurrentNode    string   `json:"current_node"`
	DocIDs         []string `json:"doc_ids,omitempty"`
}

// 添加流式响应头
func SetStreamHeaders(c *gin.Context) {
	headers := c.Writer.Header()
	headers.Set("Content-Type", "text/event-stream")
	headers.Set("Cache-Control", "no-cache")
	headers.Set("Connection", "keep-alive")
	headers.Set("Transfer-Encoding", "chunked")
}

// 向python服务请求生成回答
func GenerateMessage(ctx context.Context, chunkChan chan string, conversation_id string, stream grpc.ServerStreamingClient[pb.Response]) {
	// 发送请求
	log.Println("正在接收流式响应...")
	for {
		select {
		case <-ctx.Done():
			log.Println("客户端断开连接")
			return
		default:
			resp, err := stream.Recv()
			// 流结束
			if err == io.EOF {
				log.Println("流式响应接收完成.")
				return
			} else if err != nil {
				log.Printf("gRPC 读取失败: %v", err)
				//chunkChan <- "data: {\"type\":\"error\",\"msg\":\"gRPC 服务错误\"}\n\n"
				return
			}
			// 解析响应
			var rawData = resp.GetData()
			chunkChan <- rawData
		}
	}
}

// 处理消息分块
func handleChunk(w io.Writer, rawChunk any) bool {
	switch chunk := rawChunk.(type) {
	case StreamChunk:
		jsonData, err := json.Marshal(chunk)
		if err != nil {
			fmt.Fprintf(w, "data: {\"type\":\"error\",\"msg\":\"JSON序列化失败\"}\n\n")
			return false
		}
		fmt.Fprintf(w, "data: %s\n\n", jsonData)
	case string:
		fmt.Fprintf(w, "data: %s\n\n", chunk)
	}
	// 显式刷新缓冲区
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
	//fmt.Println("流式响应:", rawChunk)
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
	// 获取启用的doc id
	base_id := chatRequest.BaseID

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

	// 处理会话
	conversation, err := db.FindOneConversation(ctx, bson.M{"user_id": user_id, "conversation_id": user_chatMessage.ConversationID})
	if err == mongo.ErrNoDocuments {
		if user_chatMessage.Parent == "client-created-root" {
			conversation = models.Conversation{
				ConversationID: user_chatMessage.ConversationID,
				UserID:         user_id,
				Title:          "New Chat",
				CurrentNode:    user_chatMessage.MessageID,
				BaseID: base_id,
				DefaultModel:   "auto",
				IsArchived:     false,
				CreatedAt:      user_chatMessage.CreatedAt,
				UpdatedAt:      time.Now(),
			}

			// 确保 conversation_id 不能为空
			if conversation.ConversationID == "" {
				log.Println("错误: conversation_id 为空，无法插入新会话")
				c.JSON(http.StatusBadRequest, gin.H{"msg": "会话 ID 不能为空"})
				return
			}

			_, err := db.Conversation.InsertOne(ctx, conversation)
			if err != nil {
				log.Println("插入失败:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"msg": "会话插入失败", "err": err.Error()})
				return
			}
		} else {
			log.Println("找不到会话，且 parent 不是 'client-created-root'")
			c.JSON(http.StatusNotFound, gin.H{"msg": "会话不存在!"})
			return
		}
	} else if err != nil {
		log.Println("err:", err)
		c.JSON(http.StatusBadRequest, gin.H{"msg": "会话查询失败", "err": err.Error()})
		return
	} else {
		// 更新消息父节点的 children
		err := db.UpdateOneMessage(ctx, bson.M{"conversation_id": conversation.ConversationID, "message_id": user_chatMessage.Parent},
			bson.M{
				"$addToSet": bson.M{"children": user_chatMessage.MessageID}, // 避免重复
				"$set":      bson.M{"updated_at": time.Now()},
			})
		if err != nil {
			log.Println("父节点更新失败,err:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "消息更新失败", "err": err.Error()})
			return
		}

		// 更新 conversation 的 current_node
		conversation.CurrentNode = user_chatMessage.MessageID
		err = db.UpdateOneConversation(ctx, bson.M{"user_id": user_id, "conversation_id": conversation.ConversationID}, bson.M{
			"$set": bson.M{"current_node": conversation.CurrentNode, "updated_at": time.Now()},
		})
		if err != nil {
			log.Println("err:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "会话更新失败", "err": err.Error()})
			return
		}
	}

	// 更新并插入用户消息
	user_chatMessage.ConversationID = conversation.ConversationID
	user_chatMessage.UpdatedAt = time.Now()
	_, err = db.ChatMessage.InsertOne(ctx, user_chatMessage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "消息插入失败", "err": err.Error()})
		return
	}

	// 查找启用的知识库文件
	var docs []models.Document
	var docIds []string
	if base_id != 0 {
		err = db.DB.Model(&models.Document{}).Where("base_id = ? AND status = 1 AND is_enabled = true", base_id).Find(&docs).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"msg": "找不到指定的知识库"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"msg": "查找知识库失败"})
			}
			return
		}
		for _, doc := range docs {
			docIds = append(docIds, strconv.FormatInt(doc.DocID, 10))
		}
	}

	// 生成gRPC客户端
	var client = middleware.NewStreamClient()

	// 将Conversation转换为JSON
	var postData = GRPCData{
		ConversationID: conversation.ConversationID,
		CurrentNode:    conversation.CurrentNode,
	}
	// 调用rag, 传递doc ids
	if base_id != 0 {
		postData.DocIDs = docIds
	}
	log.Println(base_id,postData)
	jsonData, err := json.Marshal(postData)
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
	chunkChan := make(chan string)
	// metadata := StreamChunk{
	// 	Type:           "meta",
	// 	ConversationID: conversation.ConversationID,
	// }
	// chunkChan <- metadata // 写入元数据
	var once sync.Once
	go func(once *sync.Once) {
		defer once.Do(func() { close(chunkChan) })
		GenerateMessage(ctx, chunkChan, conversation.ConversationID, stream)
	}(&once)

	// 设置流式响应头
	SetStreamHeaders(c)
	// 流式返回分块数据
	c.Stream(func(w io.Writer) bool {
		select {
		case <-ctx.Done():
			log.Printf("客户端 %d 断开连接.", user_id)
			once.Do(func() { close(chunkChan) })
			return false
		case rawChunk, ok := <-chunkChan:
			if !ok {
				return false
			}
			return handleChunk(w, rawChunk)
		}
	})
}
