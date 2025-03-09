package models

import "time"

// Session 结构体用于映射到数据库的 sessions 表
type Session struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`          // 自增主键
	SessionID string    `gorm:"type:varchar(255);unique;not null"` // 会话ID，唯一且非空
	UserID    int64     `gorm:"not null"`                          // 用户ID，外键关联到 users 表
	CreatedAt time.Time `gorm:"not null"`                          // 会话创建时间
	UpdatedAt time.Time `gorm:"not null"`                          // 会话更新时间
	ExpiresAt time.Time `gorm:"not null"`                          // 会话过期时间
}
