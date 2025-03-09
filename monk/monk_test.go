//Package monk
//Author: NUM-1111
//Date: 2025-03-09
//Description: 用于测试用户登陆界面的脚本

package monk

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

//模拟注册 API 路由
func RegisterHandler(c* gin.Context){
	//获取请求中用户名和密码
	username := c.DefaultPostForm("username","")
	password := c.DefaultPostForm("password","")
	email := c.DefaultPostForm("email","")

	//检查密码是否符合要求
	if len(password) < 6 || len(password) > 15 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be between 6 and 15 characters"})
		return
	}
	
	if containsSpace(password){
		c.JSON(http.StatusBadRequest,gin.H{"error":"Password can't include space"})
		return
	}

	if username == "existinguser" {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	if email == "existemail@hrbeu.edu.cn"{
		c.JSON(http.StatusConflict, gin.H{"error":"email already exists"})
		return
	}

	c.JSON(http.StatusCreated,gin.H{"message":"User create successfully"})
}

func containsSpace(password string) bool {
	return strings.Contains(password, " ")
}

// 模拟登录 API 路由
func LoginHandler(c *gin.Context) {
	username := c.DefaultPostForm("username", "")
	password := c.DefaultPostForm("password", "")
	email := c.DefaultPostForm("email","")

	if username == "existuser" && password == "correctpassword" && email == "existemail@hrbeu.edu.cn" {
		c.JSON(http.StatusOK, gin.H{"message": "Login successful"})
		return
	}
	c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
}

// 测试注册功能
func TestRegister(t *testing.T) {
	r := gin.Default()

	// 设置注册路由
	r.POST("/register", RegisterHandler)

	// 测试用例 1: 正确的用户名和密码
	t.Run("Valid Registration", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/register", nil)
		req.Form.Add("username", "newuser")
		req.Form.Add("password", "password123")

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
	r.POST("/login", LoginHandler)

	// 创建一个带用户名和密码的 POST 请求
	req, _ := http.NewRequest("POST", "/login", nil)
	req.Form.Add("username", "existuser")
	req.Form.Add("password", "correctpassword")

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