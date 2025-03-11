package services

import (
	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// 创建消费者实例
// 消费组允许多个消费者并行处理
// 创建消费者实例
func CreateConsumers(rdb *redis.Client, count int) {
	// 如果消费组不存在，则创建
	err := rdb.XGroupCreateMkStream(db.CTX, config.StreamName, config.GroupName, "0").Err()
	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		log.Fatalf("创建消费组错误: %v", err)
	}

	var wg sync.WaitGroup

	// 启动指定数量的消费者
	for i := range count {
		wg.Add(1)
		consumerName := fmt.Sprintf("consumer_%d", i+1)
		go StartConsumer(rdb, &wg, consumerName)
	}

	wg.Wait()
}

// StartConsumer 启动 Redis Stream 消费者
func StartConsumer(rdb *redis.Client, wg *sync.WaitGroup, consumerName string) {
	defer wg.Done()

	log.Printf("[%s]开始监听消息...", consumerName)
	for {
		streams, err := rdb.XReadGroup(db.CTX, &redis.XReadGroupArgs{
			Group:    config.GroupName,
			Consumer: consumerName,
			Streams:  []string{config.StreamName, ">"}, //从最新的未确认消息开始消费 (">" 代表自动分配消息)
			Count:    1,
			Block:    0,
		}).Result()
		if err != nil {
			log.Printf("[%s] 读取消息失败: %v", consumerName, err)
			time.Sleep(time.Second)
			continue
		}

		for _, stream := range streams {
			for _, message := range stream.Messages {
				emailStr, ok1 := message.Values["email"].(string)
				codeStr, ok2 := message.Values["code"].(string)
				if !ok1 || !ok2 {
					log.Printf("[%s] 消息格式错误: %v", consumerName, message.Values)
					rdb.XAck(db.CTX, config.StreamName, config.GroupName, message.ID)
					continue
				}
				log.Println("开始发送邮件:", emailStr, codeStr)
				// 发送邮件
				err = SendEmail(emailStr, codeStr)
				if err != nil {
					log.Printf("发送邮件失败: %v", err)
				} else {
					// 发送成功后 ACK
					rdb.XAck(db.CTX, config.StreamName, config.GroupName, message.ID)
					log.Printf("[%s] 邮件已发送到 %s, 验证码: %s", consumerName, emailStr, codeStr)
				}
			}
		}
	}
}
