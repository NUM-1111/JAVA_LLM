package routes

import (
	"Go_LLM_Web/middleware"
	"Go_LLM_Web/services"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"}, // 允许的前端地址（React/Vue）
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true, // 允许携带 Cookie
		MaxAge:           12 * time.Hour,
	}))
	r.POST("/login", services.UserLogin)
	r.POST("/register", services.UserRegister)
	r.POST("/send/email", services.EmailHandler)
	r.POST("/chat/conversation", services.HandleNewMessage)
	api := r.Group("/api")
	api.Use(middleware.AuthSession)
	api.POST("/change/username", services.ChangeUserName)
}
