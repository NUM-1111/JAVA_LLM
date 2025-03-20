package db

import (
	"Go_LLM_Web/models"
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client
var ChatSession *mongo.Collection
var ChatMessage *mongo.Collection

func InitMongoDB(url string) {
	// 设置 MongoDB 连接参数
	clientOptions := options.Client().ApplyURI(url)

	// 建立连接（设置超时时间为10秒）
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var err error
	client, err = mongo.Connect(ctx, clientOptions)
	if err != nil {
		panic(err)
	}
	// 验证连接
	if err = client.Ping(ctx, nil); err != nil {
		panic(err)
	}
	ChatSession = client.Database("users_db").Collection("chat_session")
	ChatMessage = client.Database("users_db").Collection("chat_message")
	log.Println("[Mongo] service is running.")
}

func CloseMongoDB() {
	if client != nil {
		// 创建专用关闭上下文
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := client.Disconnect(ctx); err != nil {
			log.Printf("MongoDB关闭异常: %v", err)
		}
	}
	log.Println("[Mongo] service shutdown.")
}

// 查找一个会话
func FindOneSession(ctx context.Context, query bson.M) (models.ChatSession, error) {
	var result models.ChatSession
	err := ChatSession.FindOne(ctx, query).Decode(result)
	if err == mongo.ErrNoDocuments {
		return result, fmt.Errorf("找不到会话: %v", err)
	} else if err != nil {
		return result, fmt.Errorf("会话查找失败: %v", err)
	}
	return result, nil
}

// 查找一个消息
func FindOneMessage(ctx context.Context, query bson.M) (models.ChatMessage, error) {
	var result models.ChatMessage
	err := ChatMessage.FindOne(ctx, query).Decode(result)
	if err == mongo.ErrNoDocuments {
		return result, fmt.Errorf("找不到消息: %v", err)
	} else if err != nil {
		return result, fmt.Errorf("消息查找失败: %v", err)
	}
	return result, nil
}

// 查找所有符合的消息
func FindMessages(ctx context.Context, query bson.M) ([]models.ChatMessage, error) {
	// 获取游标
	cursor, err := ChatMessage.Find(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("查询失败: %v", err)
	}
	defer cursor.Close(ctx)

	// 直接解码全部结果
	var results []models.ChatMessage
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("解码失败: %v", err)
	}

	// 检查游标错误
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("游标错误: %v", err)
	}

	return results, nil
}

// 更新单条消息
func UpdateOneMessage(ctx context.Context, query bson.M, update bson.M) error {
	// 必须使用 $set 或其他更新操作符
	result, err := ChatMessage.UpdateOne(
		ctx,
		query,
		bson.M{"$set": update},            // 确保使用更新操作符
		options.Update().SetUpsert(false), // 明确关闭 upsert
	)
	if err != nil {
		return fmt.Errorf("消息更新操作失败: %w", err)
	}

	// 检查匹配情况
	if result.MatchedCount == 0 {
		return fmt.Errorf("未找到匹配消息")
	}

	// 可选：检查是否实际修改
	if result.ModifiedCount == 0 {
		log.Println("消息已存在但未修改:", query)
	}

	return nil
}

// 更新单条消息
func UpdateOneSession(ctx context.Context, query bson.M, update bson.M) error {
	// 必须使用 $set 或其他更新操作符
	result, err := ChatSession.UpdateOne(
		ctx,
		query,
		bson.M{"$set": update},            // 确保使用更新操作符
		options.Update().SetUpsert(false), // 明确关闭 upsert
	)
	if err != nil {
		return fmt.Errorf("会话更新操作失败: %w", err)
	}

	// 检查匹配情况
	if result.MatchedCount == 0 {
		return fmt.Errorf("未找到匹配会话")
	}

	// 可选：检查是否实际修改
	if result.ModifiedCount == 0 {
		log.Println("会话已存在但未修改:", query)
	}

	return nil
}
