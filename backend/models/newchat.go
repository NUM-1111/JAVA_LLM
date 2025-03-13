package models

import(
	//"time"
)

//对话结构
type Chat struct{
	ID string `json:"id" binding:"required"`
	Messages []string `json:"message" binding:"required"`
	//CreatedAt time.Time `json:"created_at" binding:"required"`
}



