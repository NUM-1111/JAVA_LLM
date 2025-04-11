package main

import (
	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/middleware"
	"Go_LLM_Web/routes"
	"Go_LLM_Web/services"
	"fmt"

	"github.com/gin-gonic/gin"
)

func main() {
	// 启动Postgres
	fmt.Println(config.PG_dsn)
	db.InitPostgresDB(config.PG_dsn)
	defer db.ClosePostgresDB()

	// 启动MongoDB
	db.InitMongoDB(config.Mongo_url)
	defer db.CloseMongoDB()

	// 启动Redis
	db.InitRedis(&config.RedisOpt)
	defer db.CloseRedis()

	// 启动gRPC
	middleware.InitGRPCConn()
	defer middleware.CloseGRPCConn()

	// 启动消费者
	go services.CreateConsumers(db.Redis, config.ConsumerCount)

	// 启动 Gin 服务器
	r := gin.Default()

	// 加载路由
	routes.SetupRoutes(r)

	//启动服务器
	r.Run("0.0.0.0:8080")

}
