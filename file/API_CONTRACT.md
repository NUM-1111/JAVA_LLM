# API 契约 (API Contract)

> 目标：这里是“前后端对接真相源”。API.md 可以做对外文档，但开发以本契约为准。

---

## 1. 统一响应包装

除 SSE 流式接口外，统一使用：

```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}
```

---

## 2. 鉴权约定（JWT）

- **Header**：`Authorization: {JWT_TOKEN}`
- **注意**：无 `Bearer` 前缀（前端约定如此）
- **错误**：未认证/token 无效应返回 401（由 Spring Security 负责）

---

## 3. 字段命名约定

- **前端期望**：snake_case（尤其是列表/DTO 返回）
- **后端实体**：camelCase（JPA Entity）
- **实践**：通过 DTO 显式 `@JsonProperty` 输出 snake_case（已在 KnowledgeBaseDTO/DocumentDTO 等落地）

---

## 4. SSE 事件协议（/api/new/message）

### 4.1 Content-Type
- `text/event-stream`

### 4.2 每条事件格式
服务端逐条输出：
- `data: {JSON}\n\n`

### 4.3 JSON 事件类型
- **首帧（新对话）**：`{"type":"conversation_id","conversation_id":"..."}`
- **答案 chunk**：`{"type":"answer_chunk","content":"..."}`
- **结束状态**：`{"type":"status","message":"ANSWER_DONE"}`
- **错误**：`{"type":"error","message":"..."}`

---

## 5. 分页约定

列表接口采用：
- `limit`：默认 10
- `offset`：默认 0

返回：
- `{"total": number, "data": [...]}`（放在 `Result.data` 内）

---

## 6. 关键接口清单（摘要）

### 6.1 Auth
- `POST /api/login`
- `POST /api/register`
- `POST /api/send/email`
- `POST /api/checkcode`
- `POST /api/reset/password`

### 6.2 Knowledge Base
- `POST /api/knowledge/create`
- `GET /api/knowledge/list`
- `GET /api/knowledge/info/{baseId}`
- `PUT /api/knowledge/edit/{baseId}`
- `POST /api/knowledge/search`
- `DELETE /api/knowledge/delete/{baseId}`

### 6.3 Document
- `POST /api/knowledge/upload/file`
- `GET /api/knowledge/document/list`
- `GET /api/knowledge/document/{docId}`
- `GET /api/knowledge/document/detail`
- `POST /api/knowledge/document/change/status`
- `POST /api/knowledge/document/rename`
- `POST /api/knowledge/delete/document`

### 6.4 Chat / Conversation
- `POST /api/new/message`（SSE）
- `GET /api/get/conversation/{conversationId}`
- `GET /api/query/conversation`
- `POST /api/query/messages`
- `POST /api/get/latest/id`
- `POST /api/delete/conversation`
- `PUT /api/rename/conversation`
- `POST /api/delete/chat`

### 6.5 User Settings
- `POST /api/change/username`
- `POST /api/change/email`
- `GET /api/user/info`
- `POST /api/delete/account`
- `POST /api/user-settings/delete/chat`（设置页备用路由）


