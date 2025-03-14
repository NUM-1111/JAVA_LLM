package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var MClient *mongo.Client
var MCTX context.Context

func InitMongoDB(url string) {
	// 设置 MongoDB 连接参数
	clientOptions := options.Client().ApplyURI(url)

	// 建立连接（设置超时时间为10秒）
	MCTX, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var err error
	MClient, err = mongo.Connect(MCTX, clientOptions)
	if err != nil {
		panic(err)
	}
	log.Println("[Mongo] service is running.")
}

func CloseMongoDB() {
	if MClient != nil {
		MClient.Disconnect(MCTX)
	}
	log.Println("[Mongo] service shutdown.")
}
