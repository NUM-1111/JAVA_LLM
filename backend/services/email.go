package services

import (
	"Go_LLM_Web/config"
	"Go_LLM_Web/db"
	"fmt"

	"github.com/redis/go-redis/v9"
	"gopkg.in/gomail.v2"
)

// PushEmailTask 将邮件任务写入 Redis Stream
func PushEmailTask(rdb *redis.Client, email, code string) error {
	_, err := rdb.XAdd(db.CTX, &redis.XAddArgs{
		Stream: config.StreamName,
		Values: map[string]any{
			"email": email,
			"code":  code,
		},
	}).Result()
	return err
}

// SendEmail 使用 gomail 发送邮件
func SendEmail(toEmail string, code string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", config.FromEmail)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "您的验证码")
	emailBody := fmt.Sprintf(
		`<!DOCTYPE html>
	<html lang="en">
	<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>验证码邮件</title>
	</head>
	<body style="font-family: Arial, sans-serif; background-color: #eee; margin: 0; padding: 0;">
	<div class="container" style="width: 100%%; max-width: 700px; margin: 0 auto; background-color: #fff; padding: 20px;">
		<div class="header" style="background-color: #415A94; color: #fff; padding: 5px 20px; text-align: left; font-size: 28px;">HEU WEB</div>
		<div class="main" style="margin-top: 30px; margin-left: 10px; font-size: 20px; line-height: 1.5; color: #000;">
		<h2 style="color:#000;">邮箱验证码</h2>
		<p style="margin-bottom: 10px; color: #000;">欢迎注册HEU WEB~</p>
		<p style="margin-bottom: 10px; color: #000;">您的验证码是：<strong style="color: #000;">%s</strong>，请在 %d 分钟内进行验证。</p>
		<p style="margin-bottom: 10px; color: #000;">如果该验证码不是您本人申请，请忽略此消息。</p>
		</div>
		<div class="footer" style="background: #f7f7f7; margin-top: 20px; padding: 10px; text-align: left; font-size: 15px; color: #999;">
		<a href="%s" style="color: #929292; text-decoration: none;">返回首页</a>
		</div>
	</div>
	</body>
	</html>`, code, config.EmailExpire, config.DomainUrl)
	m.SetBody("text/html", emailBody)

	return config.Dialer.DialAndSend(m)
}
