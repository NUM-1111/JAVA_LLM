package db

import (
	"Go_LLM_Web/models"
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// 初始化数据库
var DB *gorm.DB

func InitDB(dsn string) {
	//连接数据库
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		PrepareStmt: true, // 预编译 SQL 语句
	})
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	// 获取底层 sql.DB 实例并设置连接池参数
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal(err)
	}

	// 设置连接池参数
	sqlDB.SetMaxIdleConns(10)    // 设置空闲连接池的最大连接数
	sqlDB.SetMaxOpenConns(100)   // 设置最大打开连接数
	sqlDB.SetConnMaxLifetime(30) // 设置连接的最大生命周期（单位：秒）

	//自动迁移
	DB.AutoMigrate(&models.User{})
	DB.AutoMigrate(&models.Session{})
	fmt.Println("[POSTGRES] service is running.")
}

func CloseDB() {
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal(err)
	}
	if err := sqlDB.Close(); err != nil {
		log.Fatal(err)
	}
	fmt.Println("[POSTGRES] service shutdown.")
}
