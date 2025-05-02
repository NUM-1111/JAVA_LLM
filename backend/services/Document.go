package services

import (
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"Go_LLM_Web/models/request"
	"Go_LLM_Web/services/utils"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func UploadFile(c *gin.Context) {
	session, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "无效的登录凭证"})
		return
	}
	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "身份认证失败"})
		return
	}
	// 获取base id
	idStr := c.Param("id")
	baseID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "无效的知识库ID"})
		return
	}
	// 获取单个文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件获取失败: " + err.Error()})
		return
	}
	filename := filepath.Base(file.Filename)
	fileSuffix := filepath.Ext(filename)

	// 检查知识库是否存在
	var base models.KnowledgeBase
	err = db.DB.Model(&base).Where("base_id = ? AND user_id = ?", baseID, s.UserID).First(&base).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"msg": "找不到对应的知识库!"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "查找知识库失败"})
		}
		return
	}

	// 保存文件
	docID := utils.GenerateSnowflakeID()
	filePath := base.BasePath + fmt.Sprintf("/%d%s", docID, fileSuffix)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "文件保存失败!"})
		return
	}
	// 创建文件记录
	var doc = models.Document{
		DocID:      docID,
		BaseID:     baseID,
		DocName:    filename,
		FileSuffix: fileSuffix,
		FileType:   utils.GetFileTypeBySuffix(fileSuffix),
		FilePath:   filePath,
		IsEnabled:  true,
	}
	if err := db.DB.Create(&doc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "文件保存失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"msg": "文件上传成功"})
}

func DeleteFile(c *gin.Context) {
	session, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "无效的登录凭证"})
		return
	}
	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "身份认证失败"})
		return
	}
	var req request.DocDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数格式错误"})
		return
	}
	// 检查知识库是否存在
	var base models.KnowledgeBase
	err := db.DB.Model(&base).Where("base_id = ? AND user_id = ?", req.BaseID, s.UserID).First(&base).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"msg": "找不到对应的知识库!"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "查找知识库失败"})
		}
		return
	}
	// 查找文件记录
	var doc models.Document
	err = db.DB.Model(&doc).Where("doc_id = ?", req.DocID).First(&doc).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"msg": "找不到要删除的文件"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "文件查找失败"})
		}
		return
	}
	// 删除物理文件
	if err := utils.DeletePath(doc.FilePath); err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "文件删除失败"})
		return
	}
	// 删除文件记录
	if err := db.DB.Delete(&doc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "文件记录删除失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"msg": "文件删除成功"})
}
