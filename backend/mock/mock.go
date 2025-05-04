package main

import (
	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

func main() {
	// 启动MongoDB
	db.InitMongoDB(config.Mongo_url)
	defer db.CloseMongoDB()
	// 创建对话
	conversationID := "473d8210-5d82-4f50-8b21-f3c3342239a9"
	// userID := int64(1903358018720890880)

	// conversation := models.Conversation{
	// 	ConversationID: conversationID,
	// 	UserID:         userID,
	// 	Title:          "New Chat",
	// 	CurrentNode:    "0a28ee0d-d1d4-4c34-b097-cb1bc67cee1c",
	// 	DefaultModel:   "auto",
	// 	IsArchived:     false,
	// 	CreatedAt:      time.Now(),
	// 	UpdatedAt:      time.Now(),
	// }

	// _, err := db.Conversation.InsertOne(context.TODO(), conversation)
	// if err != nil {
	// 	log.Fatal("插入会话失败:", err)
	// }

	// 创建用户消息
	// userMessage := models.ChatMessage{
	// 	ConversationID: conversationID,
	// 	MessageID:      "msg_1",
	// 	Parent:         "client-created-root",
	// 	Children:       []string{"msg_2"},
	// 	CreatedAt:      time.Now(),
	// 	UpdatedAt:      time.Now(),
	// }

	// userMessage.Message.Author.Role = "user"
	// userMessage.Message.Content.ContentType = "text"
	// userMessage.Message.Content.Text = "你好，AI！"

	// _, err := db.ChatMessage.InsertOne(context.TODO(), userMessage)
	// if err != nil {
	// 	log.Fatal("插入用户消息失败:", err)
	// }

	// 创建AI回复
	aiMessage := models.ChatMessage{
		ConversationID: conversationID,
		MessageID:      uuid.NewString(),
		Parent:         "0a28ee0d-d1d4-4c34-b097-cb1bc67cee1c",
		Children:       []string{},
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	aiMessage.Message.Author.Role = "assistant"
	aiMessage.Message.Content.ContentType = "text"
	aiMessage.Message.Content.Text = "你好！我是一位人工智能助手。三海一核是指船舶工业、海军装备、海洋开发、核能应用的领域，哈工程的三海一核院系有船舶工程学院、海洋工程学院和核工程学院。"
	aiMessage.Message.Status = "finished_successfully"

	nextMsgId := uuid.NewString()
	aiMessage.Children = append(aiMessage.Children, nextMsgId)
	// 创建用户追问
	followUpMessage := models.ChatMessage{
		ConversationID: conversationID,
		MessageID:      nextMsgId,
		Parent:         aiMessage.MessageID,
		Children:       []string{},
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	followUpMessage.Message.Author.Role = "user"
	followUpMessage.Message.Content.ContentType = "text"
	followUpMessage.Message.Content.Text = "非常好,那么你知道Vivo50的梗的来源吗？"
	followUpMessage.Message.Status = "finished_successfully"
	_, err := db.ChatMessage.InsertOne(context.TODO(), aiMessage)
	if err != nil {
		log.Fatal("插入AI回复失败:", err)
	}
	_, err = db.ChatMessage.InsertOne(context.TODO(), followUpMessage)
	if err != nil {
		log.Fatal("插入用户追问失败:", err)
	}

	fmt.Println("数据插入完成！")
}
