package services

import (
	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"Go_LLM_Web/models"
	"Go_LLM_Web/models/request"
	"Go_LLM_Web/services/utils"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// 创建知识库
// ./data/KnowledgeBase/userID/BaseID
func CreateKnowBase(c *gin.Context) {
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

	var req request.BaseCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数格式错误,创建失败"})
		return
	}

	// 创建新知识库
	baseID := utils.GenerateSnowflakeID()

	// 创建知识库路径
	basePath := config.KBRootPath + fmt.Sprintf("/%d/%d", s.UserID, baseID)
	if err := utils.Makedir(basePath); err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "创建知识库失败(路径)"})
		return
	}

	knowBase := models.KnowledgeBase{
		BaseID:    baseID,
		UserID:    s.UserID,
		BaseName:  req.BaseName,
		BaseDesc:  req.BaseDesc,
		BasePath:  basePath,
		Documents: []models.Document{},
	}

	result := db.DB.Create(&knowBase)
	if result.Error != nil {
		log.Println(result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "创建知识库失败(底层)"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"msg": "知识库创建成功"})
}

// 获取单个知识库信息
func GetKnowBaseInfo(c *gin.Context) {
	// 获取 session
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
	// 获取路径参数 /knowledge/info/:id
	idStr := c.Param("id")
	baseID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "无效的知识库ID"})
		return
	}
	var base models.KnowledgeBase
	// 查询知识库信息
	err = db.DB.Where("user_id = ? AND base_id = ?", s.UserID, baseID).First(&base).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "获取知识库信息失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"msg": "获取成功", "data": base})
}

// 获取知识库列表
func GetKnowBaseList(c *gin.Context) {
	// 获取 session
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

	var knowBaseList []models.KnowledgeBase

	// 按照 user_id 查询知识库列表
	err := db.DB.Where("user_id = ?", s.UserID).Find(&knowBaseList).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "获取知识库列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"msg": "获取知识库列表成功", "data": knowBaseList, "total": len(knowBaseList)})
}

// 修改知识库(重命名,描述)
func UpdateKnowBase(c *gin.Context) {
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

	// 获取路径参数 /knowledge/:id
	idStr := c.Param("id")
	baseID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "无效的知识库ID"})
		return
	}

	// 检查知识库是否存在
	var base models.KnowledgeBase
	err = db.DB.Model(&base).Where("base_id = ? AND user_id = ?", baseID, s.UserID).First(&base).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"msg": "找不到要修改的知识库"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "修改知识库失败"})
		}
		return
	}

	var req request.BaseUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数格式错误,更新失败"})
		return
	}
	fmt.Println("update BaseName: ", req.BaseName, " BaseDesc: ", req.BaseDesc)
	result := db.DB.Where("base_id = ?", baseID).Updates(models.KnowledgeBase{
		BaseName: req.BaseName,
		BaseDesc: req.BaseDesc,
	})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "知识库更新失败"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"msg": "未找到要更新的知识库"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"msg": "知识库更新成功"})
}

// 删除知识库
func DeleteKnowBase(c *gin.Context) {
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

	// 获取路径参数 /knowledge/:id
	idStr := c.Param("id")
	baseID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "无效的知识库ID"})
		return
	}

	// 检查知识库是否存在
	var base models.KnowledgeBase
	err = db.DB.Model(&base).Where("base_id = ? AND user_id = ?", baseID, s.UserID).First(&base).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"msg": "找不到要删除的知识库"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "删除知识库失败"})
		}
		return
	}

	// 删除知识库物理路径(包括所有文件)
	if err := utils.DeletePath(base.BasePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "知识库文档删除失败"})
		return
	}

	// 删除所有文档记录
	err = db.DB.Where("base_id = ?", baseID).Delete(&models.Document{}).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "知识库文档删除失败"})
		return
	}

	// 删除目标知识库
	result := db.DB.Where("base_id = ?", baseID).Delete(&models.KnowledgeBase{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "删除知识库失败"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"msg": "未找到要删除的知识库"})
		return
	}

	c.JSON(200, gin.H{"msg": "删除知识库成功"})
}

//搜索知识库(通过BaseName)
func SearchKnowBase(c *gin.Context) {
	session, exists := c.Get("session")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"msg": "无效的登录凭证"})
		return
	}
	s, ok := session.(*models.Session)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"msg": "身份认证失败"})
		return
	}
	var req request.BaseSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "参数格式错误,搜索失败"})
		return
	}
	var knowBaseList []models.KnowledgeBase
	err := db.DB.Where("user_id = ? AND base_name LIKE ?", s.UserID, "%"+req.BaseName+"%").Find(&knowBaseList).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"msg": "找不到要搜索的知识库", "data": nil, "total": 0})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"msg": "搜索知识库失败"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"msg": "搜索成功", "data": knowBaseList, "total": len(knowBaseList)})
}