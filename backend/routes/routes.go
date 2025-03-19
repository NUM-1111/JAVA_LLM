package routes

import (
	"Go_LLM_Web/middleware" // 导入中间件
	"Go_LLM_Web/services"   // 导入业务逻辑层
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupRoutes 配置所有路由
func SetupRoutes(r *gin.Engine) {
	// 配置 CORS（跨域资源共享），允许前端访问后端
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"}, // 允许的前端地址（开发环境）
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}, // 允许的 HTTP 方法
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"}, // 允许的请求头
		ExposeHeaders:    []string{"Content-Length"}, // 允许前端获取的响应头
		AllowCredentials: true, // 允许跨域请求时携带 Cookie
		MaxAge:           12 * time.Hour, // 预检请求的缓存时间
	}))

	// 公开的 API 路由（不需要身份认证）
	r.POST("/login", services.UserLogin)      // 处理用户登录请求
	r.POST("/register", services.UserRegister) // 处理用户注册请求
	r.POST("/send/email", services.EmailHandler) // 发送邮件（可能用于验证码验证）

	// 受保护的 API 路由（需要用户身份认证）
	api := r.Group("/api")
	api.Use(middleware.AuthSession) // 使用会话认证中间件，确保用户已登录

	api.POST("/change/username", services.ChangeUserName)   // 允许用户修改用户名
	api.POST("/chat/conversation", services.HandleNewMessage) // 处理新的聊天消息
	api.POST("/query/conversation",services.QueryConversation) //侧边栏查询历史记录
}
