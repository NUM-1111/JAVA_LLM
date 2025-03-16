package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
)

// User 结构体表示用户表的数据库模型
type User struct {
	ID        uint      `json:"id" gorm:"primary_key;autoIncrement"` // 主键，自增 ID
	UserID    int64     `gorm:"not null"`                            // 用户ID，可作为外键关联到 users 表
	Username  string    `json:"username" gorm:"unique;not null"`     // 用户名，唯一且不能为空
	Email     string    `json:"email" gorm:"unique;not null"`        // 用户邮箱，唯一且不能为空
	Password  string    `json:"password" gorm:"not null"`            // 加密存储的用户密码
	CreatedAt time.Time `json:"created_at" gorm:"not null"`          // 账户创建时间
}

// Register 结构体表示用户注册时提交的数据
type Register struct {
	Email    string `json:"email" binding:"required"`    // 用户注册邮箱，必填
	Username string `json:"username" binding:"required"` // 用户名，必填
	Code     string `json:"code" binding:"required"`     // 邮箱验证码，必填
	Password string `json:"password" binding:"required"` // 密码，必填
}

// Login 结构体表示用户登录时提交的数据
type Login struct {
	Account  string `json:"account" binding:"required"`  // 用户名或邮箱，必填
	Password string `json:"password" binding:"required"` // 登录密码，必填
}

// CheckPasswordHash 验证输入密码是否与存储的哈希密码匹配
func (u *User) CheckPasswordHash(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil // 如果密码匹配，返回 true，否则返回 false
}
