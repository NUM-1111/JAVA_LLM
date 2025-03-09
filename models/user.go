package models

import (
	"time"
	"gorm.io/gorm"
)

type User struct {
	ID        uint      `json:"id" gorm:"primary_key"`
	Username  string    `json:"username" gorm:"unique;not null"`
	Email     string    `json:"email" gorm:"unique;not null"`
	Password  string    `json:"password" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

//初始化数据库
func InitDB() *gorm.DB{
	//连接数据库
	db,err := gorm.Open("postgres","connection_string")
	if err!= nil{
		panic("failed to connect to database")
	}

	//自动迁移
	db.AutoMigrate(&User{})
	return db
}