package monk

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/routes"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// 创建路由
func setupRouter() *gin.Engine {
	// 启动Postgres
	db.InitPostgresDB(config.PG_dsn)
	//defer db.CloseDB()

	// 启动Redis
	db.InitRedis(&config.RedisOpt)
	//defer db.CloseRedis()

	r := gin.Default()
	// 加载路由
	routes.SetupRoutes(r)
	return r
}

// 测试注册
func TestUserRegister(t *testing.T) {
	r := setupRouter()

	//构造请求体
	requestBody, _ := json.Marshal(map[string]string{
		"Email":    "test@hrbeu.edu.cn",
		"Username": "testuser",
		"Password": "password123",
	})

	//发送请求
	req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]string
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Contains(t, response["msg"], "用户注册成功!")
	assert.NotEmpty(t, response["session_id"])
}

// 测试登录
func TestUserLogin(t *testing.T) {
	r := setupRouter()

	// 构造请求体
	requestBody, _ := json.Marshal(map[string]string{
		"username": "testuser",
		"password": "password123",
	})

	// 发送请求
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]string
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Contains(t, response["msg"], "用户登录成功!")
	assert.NotEmpty(t, response["session_id"])
}
