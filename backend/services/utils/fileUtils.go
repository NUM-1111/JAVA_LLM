package utils

import (
	"Go_LLM_Web/db"
	"Go_LLM_Web/middleware"
	pb "Go_LLM_Web/middleware/streamservice"
	"Go_LLM_Web/models"
	"Go_LLM_Web/models/request"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"time"
)

// PathExists 判断路径是否存在（文件或目录都可以）
func PathExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

// Makedir 创建目录（若不存在）
func Makedir(path string) error {
	if !PathExists(path) {
		return os.MkdirAll(path, os.ModePerm)
	}
	return nil
}

// 删除指定目录(包括文件)
func DeletePath(path string) error {
	err := os.RemoveAll(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // 目录不存在也视为成功
		}
		return err
	}
	return nil
}

// GetFileTypeBySuffix 根据文件扩展名返回文件类型
func GetFileTypeBySuffix(suffix string) models.FileType {
	ext := strings.ToLower(suffix) // 获取后缀名并转为小写

	switch ext {
	case ".doc", ".docx":
		return models.DocTypeWord
	case ".xls", ".xlsx":
		return models.DocTypeExcel
	case ".ppt", ".pptx":
		return models.DocTypePPT
	case ".pdf":
		return models.DocTypePDF
	case ".txt":
		return models.DocTypeTXT
	case ".jpg", ".jpeg", ".png", ".gif", ".svg":
		return models.DocTypeImage
	case ".md":
		return models.DocTypeMarkdown
	default:
		return models.DocTypeOther
	}
}

// 请求解析文件
func FileParse(docId int64, path string) {
	ctx := context.Background()

	// 生成gRPC客户端
	var client = middleware.NewStreamClient()

	// 转换为JSON
	jsonData, err := json.Marshal(request.FileParseRequest{
		DocID:    docId,
		FilePath: path,
	})
	if err != nil {
		log.Printf("转换JSON失败: %v", err)
	}
	// 发送请求
	fmt.Println("正在解析文件 -> id:", docId)
	for true {
		stream, err := client.ProcessRequest(ctx, &pb.Request{JsonData: string(jsonData)})
		if err != nil {
			log.Println("调用gRPC服务失败:", err)
			return
		}
		resp, err := stream.Recv()
		if err != nil && err != io.EOF {
			log.Printf("gRPC 读取失败: %v", err)
			return
		}
		var result request.FileParseResult
		err = json.Unmarshal([]byte(resp.GetData()), &result)
		if err != nil {
			log.Println("结果解析失败: %v", err)
			return
		}
		if result.Type == "document_processed" {
			db.DB.Model(&models.Document{}).Where("doc_id = ?", docId).Updates(&models.Document{
				Status:      models.Success,
				TotalChunks: result.Chunks,
			})
			return
		} else if result.Type == "error" {
			db.DB.Model(&models.Document{}).Where("doc_id = ?", docId).Updates(&models.Document{
				Status:      models.Failure,
				TotalChunks: 0,
			})
			return
		}
		time.Sleep(1 * time.Second)
	}
}
