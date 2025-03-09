package main

import (
	"Go_LLM_Web/routes"
	"log"
	"net/http"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

func main() {
	// 启动 Gin 服务器
	r := gin.Default()

	//配置Session中间件,使用Cookie 存储Session
	store := cookie.NewStore([]byte("secret"))
	r.Use(sessions.Sessions("mysession",store))

	//初始化数据库连接(GORM)
	models.InitDB()

	// 加载路由
	routes.SetupRoutes(r)

	//启动服务器
	if err := r.Run("127.0.0.1:8080");err != nil{
		log.Fatal("Unable to start the server!",err)
	}

}
