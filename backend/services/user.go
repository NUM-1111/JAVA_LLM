package services

import (
	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

/*
邮件验证码
*/

func EmailHandler(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required"`
	}

	//解析请求中的json数据
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数类型异常,注册失败.", "error": err.Error()})
		return
	}
	// 校验邮箱格式
	if !IsValidEmail(req.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "邮箱格式异常,注册失败."})
		return
	}
	// 生成验证码
	code, err := GenerateCode(3)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "邮箱验证码生成失败."})
		return
	}
	// 将邮箱和验证码键值对存入redis
	err = db.Redis.Set(db.CTX, "email_code:"+req.Email, code, time.Duration(config.EmailExpire)*time.Minute).Err()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "存储验证码失败"})
		return
	}
	// 推送邮件任务到消息队列
	if err := PushEmailTask(db.Redis, req.Email, code); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "推送任务失败."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"msg": "邮箱验证码已发送!"})
}

/*
用户注册处理函数
*/
func UserRegister(c *gin.Context) {
	var userData models.Register
	// 解析请求中的JSON数据
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数类型异常,注册失败."})
		return
	}
	// 校验用户名格式
	err := ValidName(userData.Username)
	if err == ErrInvalidLength {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "用户名长度必须为3~20位!"})
		return
	} else if err == ErrInvalidPattern {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "用户名格式有误,或存在非法字符!"})
		return
	}

	// 校验邮箱格式
	if !IsValidEmail(userData.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "邮箱格式异常,注册失败."})
		return
	}
	// 校验邮箱验证码
	isValidCode, err := ValidateCode(userData.Email, userData.Code)
	if err == redis.Nil {
		c.JSON(http.StatusNotFound, gin.H{"msg": "注册邮箱与验证码邮箱不一致!"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "邮箱验证码读取失败."})
		return
	}
	if !isValidCode {
		c.JSON(http.StatusUnauthorized, gin.H{"msg": "邮箱验证码有误."})
		return
	}

	// 密码哈希加密
	hashedPwd, err := HashPassword(userData.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "密码hash加密失败."})
		return
	}

	// 创造新用户对象
	var user = models.User{
		Username:  userData.Username,
		Email:     userData.Email,
		Password:  hashedPwd,
		UserID:    GenerateSnowflakeID(), // int64
		CreatedAt: time.Now(),
	}

	//插入用户数据
	result := db.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库插入出错.", "err": result.Error})
		return
	}

	// 如果没插入成功，说明用户已存在
	if result.RowsAffected == 0 {
		c.JSON(http.StatusConflict, gin.H{"msg": "该用户已存在."})
		return
	}

	// 插入session会话记录
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

/*
用户登陆处理函数
*/
func UserLogin(c *gin.Context) {
	var userData models.Login
	// 解析并绑定前端传来的 JSON 数据
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "数据格式异常,登录失败."})
		return
	}

	var user models.User
	if strings.Contains(userData.Account, "@") {
		// 判断输入的是邮箱，先校验邮箱格式
		if !IsValidEmail(userData.Account) {
			c.JSON(http.StatusBadRequest, gin.H{"msg": "邮箱格式异常,注册失败."})
			return
		}
		// 只查询必要的字段：password 和 user_id
		err := db.DB.Select("password,user_id").Where("email = ?", userData.Account).First(&user).Error
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"msg": "该邮箱不存在."})
			return
		}
	} else {
		// 判断输入的是用户名，先进行格式校验
		err := ValidName(userData.Account)
		if err == ErrInvalidLength {
			c.JSON(http.StatusBadRequest, gin.H{"msg": "用户名长度必须为3~20位!"})
			return
		} else if err == ErrInvalidPattern {
			c.JSON(http.StatusBadRequest, gin.H{"msg": "用户名格式有误,或存在非法字符!"})
			return
		}
		// 只查询必要的字段：password 和 user_id
		err = db.DB.Select("password,user_id").Where("username = ?", userData.Account).First(&user).Error
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"msg": "该用户名不存在."})
			return
		}
	}

	// 校验用户输入的密码是否正确
	if !user.CheckPasswordHash(userData.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"msg": "密码错误"})
		return
	}

	// 将该用户的旧会话标记为失效
	result := db.DB.Model(&models.Session{}).Where("user_id = ? AND is_valid=true", user.ID).Update("is_valid", false)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库更新出错", "err": result.Error})
		return
	}

	// 生成新的会话记录
	var session = models.Session{
		SessionID: uuid.New().String(), // 生成唯一的 36 位 UUID 作为 Session ID
		UserID:    user.UserID,
		CreatedAt: time.Now(),         // 记录会话创建时间
		UpdatedAt: time.Now(),         // 记录会话更新时间
		ExpiresAt: time.Now().Add(config.SessionExpire), // 设置会话过期时间
		IsValid:   true,               // 标记新会话为有效
	}
	// 插入新会话记录到数据库，若冲突则不做任何操作
	result = db.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&session)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库插入出错.", "err": result.Error})
		return
	}

	// 返回成功的响应和新创建的 session_id
	c.JSON(http.StatusOK, gin.H{
		"msg":        "用户登录成功!",
		"session_id": session.SessionID,
	})
}


// 用户更改用户名处理函数
func ChangeUserName(c *gin.Context) {
	// 定义一个结构体用于绑定前端传来的 JSON 数据
	var userData struct {
		Username string `json:"username" binding:"required"`
	}
	// 解析 JSON 数据
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "数据格式异常,用户名更改失败."})
		return
	}

	// 从请求上下文中获取 session 信息
	session, exist := c.Get("session")
	if !exist {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "session获取失败"})
		return
	}

	// 获取用户 ID
	user_id := session.(*models.Session).UserID

	// 更新数据库中的用户名
	result := db.DB.Model(&models.User{}).Where("user_id=?", user_id).Update("username", userData.Username)

	// 检测是否是用户名重复导致的失败
	if errors.Is(result.Error, gorm.ErrDuplicatedKey) {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "用户名已存在,修改失败"})
		return
	}

	// 检测数据库更新是否发生错误
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "数据库更新出错", "err": result.Error})
		return
	}

	// 检测是否真的修改了数据
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotModified, gin.H{"msg": "新用户名不可与旧名称相同"})
		return
	}

	// 返回成功的响应
	c.JSON(http.StatusOK, gin.H{"msg": "用户名更改成功."})
}
