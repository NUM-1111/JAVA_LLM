package routes

import (
	"Go_LLM_Web/services"
	"Go_LLM_Web/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.POST("/login", services.Login)
	r.POST("/register", services.UserRegister)
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware)
}
