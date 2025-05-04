package main

import (
	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/middleware"
	"Go_LLM_Web/routes"
	"Go_LLM_Web/services"
	"Go_LLM_Web/services/utils"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	// 启动Postgres
	db.InitPostgresDB(config.PG_dsn)
	defer db.ClosePostgresDB()

	// 启动MongoDB
	db.InitMongoDB(config.Mongo_url)
	defer db.CloseMongoDB()

	// 启动Redis
	db.InitRedis(&config.RedisOpt)
	defer db.CloseRedis()

	// 启动Milvus
	db.InitMilvus(config.MilvusAddr)
	defer db.CloseMilvus()

	// 启动gRPC
	middleware.InitGRPCConn()
	defer middleware.CloseGRPCConn()

	// 启动消费者
	go services.CreateConsumers(db.Redis, config.ConsumerCount)

	// 创建知识库目录
	err := utils.Makedir(config.KBRootPath)
	if err != nil {
		log.Panicln("知识库路径创建失败!", err)
	}

	// 启动 Gin 服务器
	r := gin.Default()

	// 加载路由
	routes.SetupRoutes(r)

	//启动服务器
	r.Run("0.0.0.0:8080")

}
