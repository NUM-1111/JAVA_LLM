package models

import "time"

// FileType 枚举类型，表示文档类型
type FileType int

const (
	DocTypeWord     FileType = iota + 1 // .doc .docx
	DocTypeExcel                        // .xls .xlsx
	DocTypePPT                          // .ppt .pptx
	DocTypePDF                          // .pdf
	DocTypeTXT                          // .txt
	DocTypeImage                        // .jpg .jpeg .png .gif .svg
	DocTypeMarkdown                     // .md
	DocTypeOther
)

type ParseStatus int

const (
	None    ParseStatus = iota // 未解析
	Success                    // 解析成功
	Failure                    // 解析失败
)

// 知识库结构体(一个用户可以有多个知识库)
type KnowledgeBase struct {
	BaseID    int64      `gorm:"primaryKey" json:"baseId,string"` //知识库ID,主键
	UserID    int64      `gorm:"not null" json:"-"`               // 用户ID，可作为外键关联到 users 表
	BaseName  string     `gorm:"not null" json:"base_name"`       // 知识库名称
	BaseDesc  string     ` json:"base_desc"`                      // 知识库描述,可为空
	BasePath  string     `gorm:"not null" json:"-"`               // 知识库存储路径
	CreatedAt time.Time  `gorm:"not null" json:"created_at"`      // 知识库创建时间
	UpdatedAt time.Time  `gorm:"not null" json:"updated_at"`      // 知识库更新时间
	Documents []Document `gorm:"foreignKey:BaseID"`
}

// 文档结构体(属于某一个知识库)
type Document struct {
	DocID      int64       `gorm:"primaryKey" json:"docId,string"` //文档ID,主键
	BaseID     int64       `gorm:"not null" json:"baseId,string"`  // 知识库ID，可作为外键关联到 know_base 表
	DocName    string      `gorm:"not null" json:"doc_name"`       // 文档名称
	FileSuffix string      `gorm:"not null" json:"-"`              // 文档后缀名
	FileType   FileType    `gorm:"not null" json:"file_type"`      // 文档类型
	FilePath   string      `gorm:"not null" json:"-"`              // 文档路径
	IsEnabled  bool        `gorm:"not null" json:"is_enabled"`     // 是否启用
	Status     ParseStatus `gorm:"not null" json:"status"`         // 解析状态
	CreatedAt  time.Time   `gorm:"not null" json:"created_at"`     // 文档创建时间
	UpdatedAt  time.Time   `gorm:"not null" json:"updated_at"`     // 文档更新时间
}

// 文档切片结构体(用于后续向量化处理,目前暂时不用)
/*
type Chunk struct{
	ID   uint `gorm:"primary_key;autoIncrement"` // 主键，自增 ID
	DocID int64 `gorm:"not null"` // 文档ID，可作为外键关联到 document 表
	ChunkID int64 `gorm:"not null"` // 切片ID，可作为外键关联到 chunk 表
	ChunkText string `gorm:"not null"` // 切片文本内容
	CreatedAt time.Time `gorm:"not null"` // 切片创建时间
	UpdatedAt time.Time `gorm:"not null"` // 切片更新时间
}
*/
