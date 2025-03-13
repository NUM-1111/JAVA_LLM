package routes

import (
	"Go_LLM_Web/middleware"
	"Go_LLM_Web/services"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.POST("/login", services.UserLogin)
	r.POST("/register", services.UserRegister)
	r.POST("/send/email/code", services.EmailHandler)
	r.POST("/chat/new",services.NewChat)
	r.POST("/chat/:id",services.GetChat)
	api := r.Group("/api")
	api.Use(middleware.AuthSession)
	api.POST("/change/username", services.ChangeUserName)
}
