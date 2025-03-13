package services

import (
	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// 自定义错误信息
var (
	ErrInvalidLength  = errors.New("lengthErr")  // 长度错误
	ErrInvalidPattern = errors.New("patternErr") // 格式错误
	validCharsRegex   = regexp.MustCompile(`^[a-zA-Z0-9#._-]+$`)
	mustContainRegex  = regexp.MustCompile(`[a-zA-Z0-9]`)       // 至少包含一个字母或数字
	emailRegex        = regexp.MustCompile(config.EmailPattern) // 邮箱正则
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
func GenerateSnowflakeID() int64 {
	return config.SFNode.Generate().Int64()
}

// IsValidName 校验用户名格式
func ValidName(username string) error {
	length := len(username)
	if length < config.NameMinLength || length > config.NameMaxLength {
		return ErrInvalidLength
	}
	// 确保至少包含一个字母或数字
	if !mustContainRegex.MatchString(username) {
		return ErrInvalidPattern
	}

	// 确保只包含合法字符
	if !validCharsRegex.MatchString(username) {
		return ErrInvalidPattern
	}
	return nil
}

// 验证邮箱是否合法
func IsValidEmail(email string) bool {
	// 使用正则匹配邮箱
	return emailRegex.MatchString(email)
}

// 随机生成验证码（这里生成 n 个字节，结果为 2*n 个十六进制字符）
func GenerateCode(n int) (string, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return "", fmt.Errorf("验证码生成失败! err:%v", err)
	}
	code := strings.ToUpper(hex.EncodeToString(b))
	return code, nil
}

// 校验验证码是否匹配
func ValidateCode(email string, code string) (bool, error) {
	pre_code, err := db.Redis.Get(db.CTX, "email_code:"+email).Result()
	if err != nil {
		return false, err
	}
	if !strings.EqualFold(code, pre_code) {
		return false, nil
	}
	return true, nil
}
