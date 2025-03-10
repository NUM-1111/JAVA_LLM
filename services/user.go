package services

import (
	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

// 注册用户
func UserRegister(c *gin.Context) {
	var userData models.Register
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数类型异常,注册失败."})
		return
	}
	if !IsValidEmail(userData.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "邮箱格式异常,注册失败."})
		return
	}
	// 密码哈希加密
	hashedPwd, err := HashPassword(userData.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "密码hash加密失败."})
		return
	}
	var user = models.User{
		Username:  userData.Username,
		Email:     userData.Email,
		Password:  hashedPwd,
		UserID:    GenerateSnowflakeID(), // int64
		CreatedAt: time.Now(),
	}

	result := db.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库插入出错.", "err": result.Error})
		return
	}

	// 如果没插入成功，说明用户名已存在
	if result.RowsAffected == 0 {
		c.JSON(http.StatusConflict, gin.H{"msg": "该用户已存在."})
		return
	}

	var session = models.Session{
		SessionID: uuid.New().String(), // 36位string
		UserID:    user.UserID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		ExpiresAt: time.Now().Add(config.SessionExpire),
	}
	result = db.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&session)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库插入出错.", "err": result.Error})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"msg":        "用户注册成功!",
		"session_id": session.SessionID,
	})
}

// 用户登陆
func UserLogin(c *gin.Context) {
	var userData models.Login
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "数据格式异常,登录失败."})
		return
	}
	// 只查询必要的字段
	var user models.User
	err := db.DB.Select("password,user_id").Where("username = ?", userData.Username).First(&user).Error
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"msg": "用户不存在."})
		return
	}

	// 验证密码
	if !user.CheckPasswordHash(userData.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"msg": "密码错误"})
		return
	}
	fmt.Println(user.UserID)
	// 将旧会话标记为失效
	result := db.DB.Model(&models.Session{}).Where("user_id = ? AND is_valid=true", user.ID).Update("is_valid", false)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库更新出错", "err": result.Error})
		return
	}
	// 插入新会话
	var session = models.Session{
		SessionID: uuid.New().String(), // 36位string
		UserID:    user.UserID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		ExpiresAt: time.Now().Add(config.SessionExpire),
		IsValid:   true,
	}
	result = db.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&session)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库插入出错.", "err": result.Error})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"msg":        "用户登录成功!",
		"session_id": session.SessionID,
	})
}

func ChangeUserName(c *gin.Context) {
	var userData struct {
		Username string `json:"username" binding:"required"`
	}
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "数据格式异常,用户名更改失败."})
		return
	}
	session, exist := c.Get("session")
	if !exist {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": "session获取失败",
		})
	}
	user_id := session.(models.Session).UserID
	result := db.DB.Where("user_id=?", user_id).Update("username", userData.Username)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库更新出错", "err": result.Error})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": "新用户名不可与旧名称相同",
		})
	}
	c.JSON(http.StatusOK, gin.H{
		"msg": "用户名更改成功.",
	})
}
