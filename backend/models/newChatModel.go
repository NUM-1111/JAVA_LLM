package models

import "time"

//"time"

// 发起请求对话
type ChatRequest struct {
	Action          string    `json:"action"`
	Messages        []Message `json:"messages"`
	MessageID       string    `json:"message_id"`
	ParentMessageID string    `json:"parent_message_id"`
	Model           string    `json:"model"`
	UseDeepThink    bool      `json:"use_deep_think"`
	CreatedAt       time.Time `bson:"created_at"`
	//SystemHints []string `json:"system_hints"`
}
