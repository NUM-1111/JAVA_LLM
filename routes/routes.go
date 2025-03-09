package routes

import (
	"Go_LLM_Web/handlers"
	"Go_LLM_Web/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.POST("/login", handlers.Login)
	r.POST("/register", handlers.UserRegister)
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware)
}
