package utils

import (
	"Go_LLM_Web/models"
	"os"
	"strings"
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
