package db

import (
	"Go_LLM_Web/models"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// 初始化数据库
var DB *gorm.DB

func InitPostgresDB(dsn string) {
	//连接数据库
	log.Println("Connecting to PostgreSQL with DSN:", dsn)
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		PrepareStmt:    true, // 预编译 SQL 语句
		TranslateError: true,
	})
	if err != nil {
		log.Fatal("Postgres连接失败:", err)
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
	err = DB.AutoMigrate(&models.User{}, &models.Session{}, &models.KnowledgeBase{}, &models.Document{})
	if err != nil {
		log.Panicln("[Postgres] failed:", err.Error())
	}
	log.Println("[Postgres] service is running.")
}

func ClosePostgresDB() {
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal(err)
	}
	if err := sqlDB.Close(); err != nil {
		log.Fatal(err)
	}
	log.Println("[Postgres] service shutdown.")
}
