package services

import (
	"Go_LLM_Web/config"
	"regexp"
	"time"

	"github.com/sony/sonyflake"
	"golang.org/x/crypto/bcrypt"
)

// 密码哈希加密
func HashPassword(password string) (string, error) {
	hashed_pwd, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed_pwd), nil
}

// 生成 Snowflake ID
func GenerateSnowflakeID() uint64 {
	sf := sonyflake.NewSonyflake(sonyflake.Settings{
		StartTime: time.Now(),
	})
	id, _ := sf.NextID()
	return id
}

// 验证邮箱格式
// 验证邮箱是否合法
func IsValidEmail(email string) bool {
	// 邮箱的正则表达式
	re := config.EmailPattern
	// 编译正则表达式
	regex := regexp.MustCompile(re)
	// 使用正则匹配邮箱
	return regex.MatchString(email)
}
