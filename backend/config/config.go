package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/bwmarrin/snowflake"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"gopkg.in/gomail.v2"
)

var (
	// Host
	GRPCHost string
	// MongoDB
	Mongo_url string

	//Postgres
	SessionExpire = 7 * 24 * time.Hour // 7天过期
	PG_dsn        string

	// Redis
	RedisOpt = redis.Options{
		Password: "", // Redis 认证密码（如果没有，可留空）
		DB:       0,  // 使用默认数据库
	}
	// Redis Stream MQ
	StreamName    = "email_stream"
	GroupName     = "email_group"
	ConsumerCount = 3

	// Milvus
	MilvusAddr string
	MilvusDB   string

	// SnowFlake
	MachineID = 0
	SFNode    *snowflake.Node

	// 邮箱验证
	EmailPattern  = `^[a-zA-Z0-9._%+-]+@hrbeu.edu.cn`
	NameMaxLength = 20
	NameMinLength = 3

	// SMTP 服务器
	SMTPServer   = "smtp.hrbeu.edu.cn"           // SMTP 服务器地址
	SMTPUser     = "hpc@hrbeu.edu.cn"            // SMTP 用户名
	SMTPPassword = os.Getenv("HEU_SMTPPassword") // SMTP 密码
	SMTPPort     = 465                           //SMTP 端口
	Dialer       *gomail.Dialer
	// Email
	FromEmail   = "hpc@hrbeu.edu.cn"                       // 发件人
	DomainUrl   = "https://github.com/NUM-1111/Go_LLM_Web" // 网站网址
	EmailExpire = 5                                        // 验证码过期时间

	// 知识库存储根目录
	KBRootPath = "./data/KnowledgeBase"
)

func init() {
	// 加载 .env 文件
	err := godotenv.Load("config/.env")
	if err != nil {
		log.Fatalf("Error loading .env file. err:%s", err)
	}

	//Postgres
	PG_dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("POSTGRES_HOST"), os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD"), os.Getenv("POSTGRES_DB"), os.Getenv("POSTGRES_PORT"))
	// MongoDB
	Mongo_url = fmt.Sprintf("mongodb://%s:%s@%s", os.Getenv("MONGO_USER"), os.Getenv("MONGO_PASSWORD"), os.Getenv("MONGO_ADDR"))
	// Redis
	RedisOpt.Addr = os.Getenv("REDIS_ADDR")
	// Milvus
	MilvusAddr = os.Getenv("MILVUS_ADDR")
	MilvusDB = os.Getenv("MILVUS_DB")
	// GRPC
	GRPCHost = os.Getenv("GRPC_HOST")

	// Create a new Node with Node number 1
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
