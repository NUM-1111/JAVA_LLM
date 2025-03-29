package db

import (
	"Go_LLM_Web/models"
	"context"
	"fmt"
	"log"
	"time"

	//"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client
var Conversation *mongo.Collection
var ChatMessage *mongo.Collection

func InitMongoDB(url string) {
	// 设置 MongoDB 连接参数
	clientOptions := options.Client().ApplyURI(url)

	// 建立连接（设置超时时间为10秒）
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
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
	// 两个Collection分别存储会话和消息
	Conversation = client.Database("users_db").Collection("conversation")
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
func FindOneConversation(ctx context.Context, query bson.M) (models.Conversation, error) {
	var result models.Conversation
	err := Conversation.FindOne(ctx, query).Decode(&result)
	if err == mongo.ErrNoDocuments {
		return result, err
	} else if err != nil {
		return result, fmt.Errorf("会话查找失败: %v", err)
	}
	return result, nil
}

// 从数据库中查询所有的conversation
func FindConversations(ctx context.Context, query bson.M, sort bson.D) ([]models.Conversation, error) {
	//使用Find查询所有符合条件的conversation
	findOptions := options.Find()
	if sort != nil {
		findOptions.SetSort(sort) // 仅当 sort 不为 nil 时才设置排序
	}
	cursor, err := Conversation.Find(ctx, query, findOptions)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	//将查询到的结果解码到切片中
	var conversations = []models.Conversation{}
	if err := cursor.All(ctx, &conversations); err != nil {
		return nil, fmt.Errorf("解码失败: %v", err)
	}

	// 检查游标错误
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("游标错误: %v", err)
	}

	//返回查询结构
	return conversations, nil
}

// 根据query(conversation_id)删除单个conversation
func DeleteOneConversation(ctx context.Context, query bson.M) error {
	// 先查找会话
	conversation, err := FindOneConversation(ctx, query)
	if err != nil {
		return fmt.Errorf("查找会话失败: %v", err)
	}

	// 删除所有message
	if err := DeleteMessages(ctx, bson.M{"conversation_id": conversation.ConversationID}); err != nil {
		return fmt.Errorf("删除消息失败: %v", err)
	}

	// 删除conversation
	if result, err := Conversation.DeleteOne(ctx, bson.M{"conversation_id": conversation.ConversationID}); err != nil {
		return fmt.Errorf("删除会话失败: %v", err)
	} else if result.DeletedCount == 0 {
		return fmt.Errorf("未找到匹配会话")
	}

	return nil
}

// 根据query(user_id)查找所有conversation,取出conversion_id后,删除所有的message,然后删除conversation
func DeleteConversations(ctx context.Context, query bson.M) error {
	// 先查找所有符合条件的conversation
	conversations, err := FindConversations(ctx, query, nil)
	if err != nil {
		return fmt.Errorf("查找会话失败: %v", err)
	}

	// 遍历conversation,删除所有的message,然后删除conversation
	for _, conversation := range conversations {
		// 删除所有message
		if err := DeleteMessages(ctx, bson.M{"conversation_id": conversation.ConversationID}); err != nil {
			return fmt.Errorf("删除消息失败: %v", err)
		}

		// 删除conversation
		if result, err := Conversation.DeleteOne(ctx, bson.M{"conversation_id": conversation.ConversationID}); err != nil {
			return fmt.Errorf("删除会话失败: %v", err)
		} else if result.DeletedCount == 0 {
			return fmt.Errorf("未找到匹配会话")
		}
	}

	return nil
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
func FindMessages(ctx context.Context, query bson.M, sort bson.D) ([]models.ChatMessage, error) {
	// 排序条件
	findOptions := options.Find()
	if sort != nil {
		findOptions.SetSort(sort) // 仅当 sort 不为 nil 时才设置排序
	}
	// 获取游标
	cursor, err := ChatMessage.Find(ctx, query, findOptions)
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

// 删除符合条件的消息
func DeleteMessages(ctx context.Context, query bson.M) error {
	result, err := ChatMessage.DeleteMany(ctx, query)
	if err != nil {
		return fmt.Errorf("消息删除操作失败: %w", err)
	}

	// 检查匹配情况
	if result.DeletedCount == 0 {
		return fmt.Errorf("未找到匹配消息")
	}

	return nil
}

// 更新单条消息
func UpdateOneMessage(ctx context.Context, query bson.M, update bson.M) error {
	// 必须使用 $set 或其他更新操作符
	result, err := ChatMessage.UpdateOne(
		ctx,
		query,
		update,                            // 确保使用更新操作符
		options.Update().SetUpsert(false), // 明确关闭 upsert
	)
	if err != nil {
		return fmt.Errorf("消息更新操作失败: %w", err)
	}

	// 检查匹配情况
	if result.MatchedCount == 0 {
		return fmt.Errorf("未找到匹配消息")
	}

	return nil
}

// 更新单条消息
func UpdateOneConversation(ctx context.Context, query bson.M, update bson.M) error {
	// 必须使用 $set 或其他更新操作符
	result, err := Conversation.UpdateOne(
		ctx,
		query,
		update,
		options.Update().SetUpsert(false),
	)
	if err != nil {
		return fmt.Errorf("会话更新操作失败: %w", err)
	}

	// 检查匹配情况
	if result.MatchedCount == 0 {
		return fmt.Errorf("未找到匹配会话")
	}

	return nil
}
