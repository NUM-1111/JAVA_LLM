package services

import (
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"net/http"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

// 注册用户
func UserRegister(c *gin.Context) {
	var userData models.Register
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "数据格式异常,注册失败."})
		return
	}

	// 密码哈希加密
	hashedPwd, err := HashPassword(userData.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "密码hash加密失败."})
		return
	}

	// 直接尝试插入用户，利用唯一约束避免重复查询
	var user_id uint // 主键
	result := db.DB.Raw(`
		INSERT INTO users (username, password, created_at)
		VALUES (?, ?, ?) 
		ON CONFLICT DO NOTHING 
		RETURNING id`, userData.Username, hashedPwd, time.Now(),
	).Scan(&user_id)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库插入出错.", "err": result.Error})
		return
	}

	if user_id == 0 {
		c.JSON(http.StatusConflict, gin.H{"msg": "用户名已存在."})
		return
	}

	// 存储并返回session id
	session := sessions.Default(c)
	session.Set("ID", user_id)
	session.Save()
	c.JSON(http.StatusOK, gin.H{
		"msg":        "用户注册成功!",
		"session_id": session.ID(),
	})
}

// 用户登陆
func UserLogin(c *gin.Context) {

}
