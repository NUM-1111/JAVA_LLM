package models

import (
	"time"
)

// 会话集合
type ChatSession struct {
	SessionID   string `bson:"session_id"`
	UserID      string `bson:"user_id"`
	Title       string `bson:"title"`
	CurrentNode string `bson:"current_node"` // 记录最新一次消息的id
	//TemplateId       string                 `bson:"template_id"`        // 对话模板id, 例如 "g-rmdbtMF7a"
	//TemplateType     string                 `bson:"template_type"`      // 模板基于的模型, GPT为 "gpt"
	DefaultModel string `bson:"default_model"` // 默认选择的模型,GPT为 "auto"
	IsArchived   bool   `bson:"is_archived"`   // 是否归档
	//IsStarred        bool                   `bson:"is_starred"`         // 是否收藏(?)
	CreatedAt time.Time `bson:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"`
	//SafeUrls         []string               `bson:"safe_urls"`          // 安全外链
	//PluginIds        []string               `bson:"plugin_ids"`         // 使用的插件id
}

// 消息集合
type ChatMessage struct {
	MessageID string    `bson:"message_id"`
	Message   Message   `bson:"message"`
	Parent    string    `bson:"parent"`
	Children  []string  `bson:"children"`
	CreatedAt time.Time `bson:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"`
}

// 消息内容
type Message struct {
	//MessageID string `bson:"message_id"`
	Author struct {
		Role string `bson:"role"`
		//Name     string         `bson:"name"`
		//MetaData map[string]any `bson:"metadata"`
	}
	Content struct {
		ContentType string   `bson:"content_type"`
		Parts       []string `bson:"parts"`
		//UserProfile      string   `bson:"user_profile"`
		//UserInstructions string   `bson:"user_instructions"`
	}
	Status    string  `bson:"status"`     // "finished_successfully"
	ModelSlug string  `bson:"model_slug"` // 调用的模型
	Weight    float32 `bson:"weight"`     // 权重
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
