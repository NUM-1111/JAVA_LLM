//Package monk
//Author: NUM-1111
//Date: 2025-03-09
//Description: 用于测试用户登陆界面的脚本

package monk

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"Go_LLM_Web/services"
)

// 测试注册功能
func TestRegister(t *testing.T) {
	r := gin.Default()

	// 设置注册路由
	r.POST("/register", services.UserRegister)

	// 测试用例 1: 正确的用户名和密码
	t.Run("Valid Registration", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/register", nil)
		req.Form.Add("username", "2023201530")
		req.Form.Add("password", "pcx123456")

		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		if resp.Code != http.StatusCreated {
			t.Errorf("期望状态码: %d, 实际返回: %d", http.StatusCreated, resp.Code)
		}

		expected := `{"message":"User created successfully"}`
		if resp.Body.String() != expected {
			t.Errorf("期望响应体: %s, 实际返回: %s", expected, resp.Body.String())
		}
	})

	// 测试用例 2: 用户名已经存在
	t.Run("Username Already Exists", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/register", nil)
		req.Form.Add("username", "existinguser")
		req.Form.Add("password", "password123")

		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		if resp.Code != http.StatusConflict {
			t.Errorf("期望状态码: %d, 实际返回: %d", http.StatusConflict, resp.Code)
		}

		expected := `{"error":"Username already exists"}`
		if resp.Body.String() != expected {
			t.Errorf("期望响应体: %s, 实际返回: %s", expected, resp.Body.String())
		}
	})

	// 测试用例 3: 密码太短
	t.Run("Short Password", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/register", nil)
		req.Form.Add("username", "newuser2")
		req.Form.Add("password", "123")

		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		if resp.Code != http.StatusBadRequest {
			t.Errorf("期望状态码: %d, 实际返回: %d", http.StatusBadRequest, resp.Code)
		}

		expected := `{"error":"Password must be between 6 and 15 characters"}`
		if resp.Body.String() != expected {
			t.Errorf("期望响应体: %s, 实际返回: %s", expected, resp.Body.String())
		}
	})

	// 测试用例 4: 密码太长
	t.Run("Long Password", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/register", nil)
		req.Form.Add("username", "newuser3")
		req.Form.Add("password", "thispasswordiswaytoolong")

		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		if resp.Code != http.StatusBadRequest {
			t.Errorf("期望状态码: %d, 实际返回: %d", http.StatusBadRequest, resp.Code)
		}

		expected := `{"error":"Password must be between 6 and 15 characters"}`
		if resp.Body.String() != expected {
			t.Errorf("期望响应体: %s, 实际返回: %s", expected, resp.Body.String())
		}
	})

	// 测试用例 5: 密码包含空格
	t.Run("Password Contains Space", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/register", nil)
		req.Form.Add("username", "newuser4")
		req.Form.Add("password", "password with space")

		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		if resp.Code != http.StatusBadRequest {
			t.Errorf("期望状态码: %d, 实际返回: %d", http.StatusBadRequest, resp.Code)
		}

		expected := `{"error":"Password cannot contain spaces"}`
		if resp.Body.String() != expected {
			t.Errorf("期望响应体: %s, 实际返回: %s", expected, resp.Body.String())
		}
	})
}


// 测试登录功能
func TestLogin(t *testing.T) {
	r := gin.Default()

	// 设置登录路由
	r.POST("/login", services.UserLogin)

	// 创建一个带用户名和密码的 POST 请求
	req, _ := http.NewRequest("POST", "/login", nil)
	req.Form.Add("username", "2023201530")
	req.Form.Add("password", "pcx123456")

	// 使用 httptest.NewRecorder 来记录响应
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	// 断言登录成功，状态码是 200 OK
	if resp.Code != http.StatusOK {
		t.Errorf("期望状态码: %d, 实际返回: %d", http.StatusOK, resp.Code)
	}

	// 进一步检查响应体
	expected := `{"message":"Login successful"}`
	if resp.Body.String() != expected {
		t.Errorf("期望响应体: %s, 实际返回: %s", expected, resp.Body.String())
	}
}