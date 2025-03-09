package models

import (
	"time"
)

type User struct {
	ID        uint      `json:"id" gorm:"primary_key"`
	Username  string    `json:"username" gorm:"unique"`
	UserID    string    `json:"userID" gorm:"unique;not null"`
	Password  string    `json:"password" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}
