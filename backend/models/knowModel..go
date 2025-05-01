package models

import "time"

/*
// User 结构体表示用户表的数据库模型
type User struct {
	ID        uint      `json:"id" gorm:"primary_key;autoIncrement"` // 主键，自增 ID
	UserID    int64     `gorm:"not null"`                            // 用户ID，可作为外键关联到 users 表
	Username  string    `json:"username" gorm:"unique;not null"`     // 用户名，唯一且不能为空
	Email     string    `json:"email" gorm:"unique;not null"`        // 用户邮箱，唯一且不能为空
	Password  string    `json:"password" gorm:"not null"`            // 加密存储的用户密码
	CreatedAt time.Time `json:"created_at" gorm:"not null"`          // 账户创建时间
}
*/

//FileType 枚举类型，表示文档类型
type FileType int

const (
	DocTypeWord FileType = iota + 1   // 1
	DocTypeExcel                     // 2
	DocTypePPT                       // 3
	DocTypePDF                       // 4
	DocTypeOther                     // 5
)

//知识库结构体(一个用户可以有多个知识库)
type KnowledgeBase struct {
	KnowID int64 `gorm:"primary_key" json:"know_id"` //知识库ID,主键
	UserID int64 `gorm:"not null" json:"user_id"` // 用户ID，可作为外键关联到 users 表
	KnowName string `gorm:"not null" json:"know_name"` // 知识库名称
	KnowDesc string `gorm:"not null" json:"know_desc"` // 知识库描述
	CreatedAt time.Time `gorm:"not null" json:"created_at"` // 知识库创建时间
	UpdatedAt time.Time `gorm:"not null" json:"updated_at"` // 知识库更新时间
}

//文档结构体(属于某一个知识库)
type Document struct {
	DocID int64 `gorm:"primary_key" json:"doc_id"` //文档ID,主键
	KnowID int64 `gorm:"not null" json:"know_id"` // 知识库ID，可作为外键关联到 know_base 表
	DocName string `gorm:"not null" json:"doc_name"` // 文档名称
	DocDesc string `gorm:"not null" json:"doc_desc"` // 文档描述
	FlieType FileType `gorm:"not null" json:"file_type"` // 文档类型
	FilePath string `gorm:"not null" json:"file_path"` // 文档路径
	CreatedAt time.Time `gorm:"not null" json:"created_at"` // 文档创建时间
	UpdatedAt time.Time `gorm:"not null" json:"updated_at"` // 文档更新时间

	//Metadata string         `gorm:"type:text"` // 扩展元数据
	//OriginalContent string         `gorm:"type:text"` // 原始文本内容
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