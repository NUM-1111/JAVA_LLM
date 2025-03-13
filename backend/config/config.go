package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/bwmarrin/snowflake"
	"github.com/redis/go-redis/v9"
	"gopkg.in/gomail.v2"
)

var (
	//Postgres
	Host          = "localhost"
	PG_user       = "postgres"
	PG_password   = "postgres"
	PG_dbname     = "user_info"
	SessionExpire = 7 * 24 * time.Hour // 7天过期
	PG_dsn        string

	// Redis
	RedisOpt = redis.Options{
		Addr:     "localhost:6379", // Redis 服务器地址
		Password: "",               // Redis 认证密码（如果没有，可留空）
		DB:       0,                // 使用默认数据库
	}
	// Redis Stream MQ
	StreamName    = "email_stream"
	GroupName     = "email_group"
	ConsumerCount = 3

	// SnowFlake
	MachineID = 0
	SFNode    *snowflake.Node

	// 邮箱验证
	//EmailPattern = `^[a-zA-Z0-9._%+-]+@hrbeu.edu.cn`
	EmailPattern  = `^[a-zA-Z0-9._%+-]+@[a-z\.]+`
	NameMaxLength = 20
	NameMinLength = 3

	// SMTP 服务器
	SMTPServer   = "smtp.hrbeu.edu.cn"           // SMTP 服务器地址
	SMTPUser     = "cxrunfree@hrbeu.edu.cn"      // SMTP 用户名
	SMTPPassword = os.Getenv("HEU_SMTPPassword") // SMTP 密码
	SMTPPort     = 465                           //SMTP 端口
	Dialer       *gomail.Dialer
	// Email
	FromEmail   = "cxrunfree@hrbeu.edu.cn"                 // 发件人
	DomainUrl   = "https://github.com/NUM-1111/Go_LLM_Web" // 网站网址
	EmailExpire = 5                                        // 验证码过期时间

)

func init() {
	//Postgres
	PG_dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=5432 sslmode=disable", Host, PG_user, PG_password, PG_dbname)
	// Create a new Node with Node number 1
	var err error
	SFNode, err = snowflake.NewNode(int64(MachineID))
	if err != nil {
		fmt.Println(err)
		return
	}
	//SMTP
	if SMTPPassword == "" {
		log.Fatal("SMTPPassword 未设置!")
	}
	Dialer = gomail.NewDialer(SMTPServer, SMTPPort, SMTPUser, SMTPPassword)
	log.Println("[SMTP] connection established.")
}
