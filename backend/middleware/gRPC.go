package middleware

import (
	"log"

	pb "Go_LLM_Web/middleware/streamservice"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var ClientConn *grpc.ClientConn

// 全局初始化 gRPC 连接
func InitGRPCConn() {
	// 连接到Python gRPC服务器
	var err error
	ClientConn, err = grpc.NewClient("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("无法连接到服务器: %v", err)
	}
}

// 关闭 gRPC 连接（程序退出时调用）
func CloseGRPCConn() {
	if ClientConn != nil {
		ClientConn.Close()
	}
}

// 每次请求创建新的 gRPC 客户端（但复用连接）
func NewStreamClient() pb.StreamServiceClient {
	return pb.NewStreamServiceClient(ClientConn)
}
