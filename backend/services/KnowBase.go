package services

import (
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// 创建知识库
func CreateKnowBase(c *gin.Context) {
	session, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "Session not found"})
		return
	}

	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "Invalid session"})
		return
	}

	// 正确获取 userID
	userID := s.UserID

	// 创建新知识库
	knowBase := models.KnowledgeBase{
		KnowID:   GenerateSnowflakeID(),
		KnowName: "新建知识库",
		KnowDesc: "新建知识库描述",
		UserID:   userID,
	}

	result := db.DB.Create(&knowBase)
	if result.Error != nil {
		c.JSON(500, gin.H{"msg": "创建知识库失败"})
		return
	}

	c.JSON(200, gin.H{
		"msg":  "创建知识库成功",
		"data": knowBase,
	})
}

// 获取知识库列表
func GetKnowBaseList(c *gin.Context) {
	// 获取 session
	session, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "Session not found"})
		return
	}

	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"err": "Invalid session"})
		return
	}

	var knowBaseList []models.KnowledgeBase

	// 按照 user_id 查询知识库列表
	err := db.DB.Where("user_id = ?", s.UserID).Find(&knowBaseList).Error
	if err != nil {
		c.JSON(500, gin.H{"msg": "获取知识库列表失败"})
		return
	}

	c.JSON(200, gin.H{
		"msg":  "获取知识库列表成功",
		"data": knowBaseList,
	})
}

// 修改知识库(重命名,描述)
func UpdateKnowBase(c *gin.Context) {
	var knowBase models.KnowledgeBase
	err := c.ShouldBindJSON(&knowBase)
	if err != nil {
		c.JSON(400, gin.H{
			"msg": "参数错误,获取知识库信息失败",
		})
	}

	result := db.DB.Model(&knowBase).Updates(models.KnowledgeBase{
		KnowName: knowBase.KnowName,
		KnowDesc: knowBase.KnowDesc,
	})
	if result.Error != nil {
		c.JSON(500, gin.H{
			"msg": "修改知识库失败",
		})
	}

	c.JSON(200, gin.H{
		"msg": "修改知识库成功",
	})
}

// 删除知识库(待修改,后续还要先删除其所有文档再删除知识库)
func DeleteKnowBase(c *gin.Context) {
	// 获取路径参数 /knowledgebases/:id
	idStr := c.Param("know_id")
	knowID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(400, gin.H{"msg": "无效的知识库ID"})
		return
	}

	result := db.DB.Delete(&models.KnowledgeBase{}, knowID)
	if result.Error != nil {
		c.JSON(500, gin.H{"msg": "删除知识库失败"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(404, gin.H{"msg": "未找到要删除的知识库"})
		return
	}

	c.JSON(200, gin.H{"msg": "删除知识库成功"})
}
