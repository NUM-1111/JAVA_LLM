package models

import (
	"time"
)

// 前端请求的消息结构
type ChatRequest struct {
	Action         string    `json:"action"`     // 执行动作如 "next"
	Message        Message   `json:"message"`    //本次用户请求的消息
	MessageID      string    `json:"message_id"` //当前消息的唯一标识符
	ConversationID string    `json:"conversation_id"`
	Parent         string    `json:"parent"`         //父消息的唯一标识符，用于构建对话上下文
	Model          string    `json:"model"`          //指定使用的 AI 语言模型，如 "gpt-4"、"claude-3"
	UseDeepThink   bool      `json:"use_deep_think"` // 是否启用深度思考模式，提高回答质量
	CreatedAt      time.Time `bson:"created_at"`     //// 请求创建时间
	//SystemHints []string `json:"system_hints"`
}

// 会话集合
type Conversation struct {
	ConversationID string ` bson:"conversation_id" json:"conversation_id"`
	UserID         int64  `bson:"user_id" `
	Title          string `bson:"title" json:"title"`
	CurrentNode    string `bson:"current_node" json:"current_node"` // 记录最新一次消息的id
	//Mapping     map[string]ChatMessage `bson:"mapping" json:"mapping"`
	//TemplateId       string                 `bson:"template_id"`        // 对话模板id, 例如 "g-rmdbtMF7a"
	//TemplateType     string                 `bson:"template_type"`      // 模板基于的模型, GPT为 "gpt"
	DefaultModel string `bson:"default_model" json:"default_model"` // 默认选择的模型,GPT为 "auto"
	IsArchived   bool   `bson:"is_archived" json:"is_archived"`     // 是否归档
	//IsStarred        bool                   `bson:"is_starred"`         // 是否收藏(?)
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
	//SafeUrls         []string               `bson:"safe_urls"`          // 安全外链
	//PluginIds        []string               `bson:"plugin_ids"`         // 使用的插件id
}

// 消息集合
type ChatMessage struct {
	ConversationID string    `bson:"conversation_id"` // 关联会话
	MessageID      string    `bson:"message_id"`
	Message        Message   `bson:"message"`
	Parent         string    `bson:"parent"`
	Children       []string  `bson:"children"`
	CreatedAt      time.Time `bson:"created_at"`
	UpdatedAt      time.Time `bson:"updated_at"`
}

// 消息内容
type Message struct {
	//MessageID string `bson:"message_id"`
	Author struct {
		Role string `json:"role" bson:"role"`
		//Name     string         `bson:"name"`
		//MetaData map[string]any `bson:"metadata"`
	}
	Content struct {
		ContentType string `json:"content_type" bson:"content_type"`
		Text        string `json:"text" bson:"text"`
		//Parts       []string `bson:"parts"`
		//UserProfile      string   `bson:"user_profile"`
		//UserInstructions string   `bson:"user_instructions"`
	}
	Status string  `bson:"status,omitempty"` // "finished_successfully"
	Model  string  `bson:"model,omitempty"`  // 调用的模型
	Weight float32 `bson:"weight,omitempty"` // 权重
	//EndTurn   bool      `bson:"end_turn"` // null | true
	//MetaData  MetaData  `bson:"metadata"`
	//Recipient string    `bson:"recipient"`
}

// 消息元数据
// type MetaData struct {
// 	MessageType         string `bson:"message_type"`
// 	ModelSlug           string `bson:"model_slug"`
// 	RequestedModelSlug  string `bson:"requested_model_slug"`
// 	RequestId           string `bson:"request_id"`
// 	AboutModelMessage   string `bson:"about_model_message"`
// 	IsUserSystemMessage bool   `bson:"is_user_system_message"`
// }
