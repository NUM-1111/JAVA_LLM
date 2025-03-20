package models

import "time"

//"time"

// 发起请求对话
type ChatRequest struct {
	Action          string    `json:"action"`     // 执行动作，例如 "chat"、"generate_text" 等
	Messages        []Message `json:"messages"`   //聊天消息列表，包含多条对话历史
	MessageID       string    `json:"message_id"` //当前消息的唯一标识符
	SessionID       string    `json:"session_id"`
	ParentMessageID string    `json:"parent_message_id"` //父消息的唯一标识符，用于构建对话上下文
	Model           string    `json:"model"`             //指定使用的 AI 语言模型，如 "gpt-4"、"claude-3"
	UseDeepThink    bool      `json:"use_deep_think"`    // 是否启用深度思考模式，提高回答质量
	CreatedAt       time.Time `bson:"created_at"`        //// 请求创建时间
	//SystemHints []string `json:"system_hints"`
}
