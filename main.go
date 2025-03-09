package main

import (
	"Go_LLM_Web/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// 启动 Gin 服务器
	r := gin.Default()

	// 加载路由
	routes.SetupRoutes(r)

	// 运行服务器
	r.Run("127.0.0.1:8080")
}
