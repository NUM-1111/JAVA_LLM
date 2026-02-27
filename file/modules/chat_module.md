# 对话模块开发文档 (Chat Module)

> 本文档用于驱动“对话与 RAG 问答”模块的迭代：明确已实现能力、当前缺口、以及可直接交给 Cursor 的下一步任务拆解。

---

## 1. 模块概述

对话模块负责 RAG 问答、对话管理、消息历史记录等功能。

**技术栈要求**:
- Java 17+
- Spring Boot 3.4.1+
- Spring AI (向量检索、LLM 调用)
- Reactor (流式响应)
- MongoDB (对话和消息存储)
- Milvus (向量数据库)

---

## 2. 当前实现状态

### 2.1 已实现功能 ✅

#### 2.1.1 发送消息（流式响应）(POST /api/new/message)
- **文件位置**: 
  - Controller: `src/main/java/com/heu/rag/core/controller/ChatController.java`
  - Service: `src/main/java/com/heu/rag/core/service/ChatService.java`
- **实现状态**: ✅ 已实现（SSE + JSON 事件流）
- **当前功能**:
  - **SSE (text/event-stream)**：服务端输出 `data: {json}\n\n`
  - **RAG 检索**：使用 `VectorStore.similaritySearch(topK=4, threshold=0.7)`
  - **LLM 流式生成**：`ChatModel.stream(prompt)`（Ollama）
  - **对话历史拼接**：读取该 conversation 最近 5 条消息作为上下文（简化版）
  - **消息持久化**：将 user/assistant 消息写入 MongoDB，并更新 Conversation.currentNode
- **当前问题**:
  1. **知识库隔离不完整（重要）**：当前向量检索未按 `baseId` 过滤，存在跨知识库“串库检索”风险（需按 metadata/baseId 过滤或分集合）。
  2. **文档启用状态未纳入检索**：`Document.isEnabled` 目前不影响 RAG 检索（需在写入 metadata 或检索过滤）。
  3. **思考过程/模型字段未对齐**：消息返回结构中 `thinking/model/thinkText` 目前是简化占位。
  4. **消息树 children 未维护**：MongoDB 中 `children` 字段目前多数为空列表。

#### 2.1.2 对话管理接口（ConversationController）
以下接口均已实现（并做了 userId ownership 校验）：
- `GET /api/get/conversation/{conversationId}`
- `GET /api/query/conversation`
- `POST /api/delete/conversation`
- `PUT /api/rename/conversation`
- `POST /api/delete/chat`
- `POST /api/query/messages`
- `POST /api/get/latest/id`

---

## 3. 前端契约（当前支持的最小字段）

### 3.1 `/api/new/message`（建议维持简化请求）
- **请求**（当前后端 `ChatRequest` 可兼容）：
  - `message`/`messageText`（以 DTO 为准）
  - `conversation_id`（空则后端创建并通过 SSE 首帧返回）
  - `baseId`（可空）

### 3.2 SSE 事件协议（已实现）
- `{"type":"conversation_id","conversation_id":"..."}`
- `{"type":"answer_chunk","content":"..."}`
- `{"type":"status","message":"ANSWER_DONE"}`
- 错误：`{"type":"error","message":"..."}`

---

## 3. 待实现功能 ⚠️

### 3.1 RAG 检索隔离（P0）
- **目标**：检索结果必须限定在当前 `baseId`（且可进一步限定 `docId/isEnabled`）
- **方案 A（推荐）**：使用 Milvus Java SDK 的 Query/Search + expr 过滤（已实现，见 `file/milvus/MILVUS_IMPLEMENTATION_STATUS.md`）
- **方案 B（可选）**：按知识库分集合（collection per baseId），隔离最彻底但运维成本更高
- **验收**：
  - 同一 query 在不同 baseId 下检索结果不同且不互相泄漏
  - 无 baseId 时不做向量检索（仅走纯 LLM）

### 3.2 思考过程与消息结构对齐（P1）
- **目标**：支持 `</think>` 分割，将 thinkText 与 answerText 分离存储与返回
- **验收**：
  - `query/messages` 返回 assistant 消息时，`message.content.thinkText` 可选存在
  - 前端 “深度思考” UI 可正常渲染

### 3.3 children 字段维护（P2）
- **目标**：形成可追溯的消息树（parent/children）
- **验收**：插入新消息时，父消息 children 自动追加

### 3.2 对话管理功能

#### 3.2.1 获取对话信息 (GET /api/get/conversation/:conversationId)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.1.2
- **路径参数**: `conversationId` (String)
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "conversation_id": "string",
      "title": "string",
      "baseId": "Long | null",
      "created_at": "ISO 8601",
      "updated_at": "ISO 8601"
    }
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 从 MongoDB 查询 Conversation
  3. 验证对话属于当前用户
  4. 返回对话信息
- **实现位置**: 创建 `ConversationController.java`

#### 3.2.2 查询对话列表 (GET /api/query/conversation)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.1.5 (侧边栏历史记录)
- **请求头**: `Authorization: JWT_TOKEN`
- **查询参数**: 可选（分页参数）
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "sessions": [
        {
          "conversation_id": "string",
          "title": "string",
          "baseId": "Long | null"
        }
      ]
    }
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询该用户的所有对话（按更新时间降序）
  3. 返回对话列表
- **实现位置**: `ConversationController.java`

#### 3.2.3 删除对话 (POST /api/delete/conversation)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.1.6
- **请求体**:
  ```json
  {
    "conversation_id": "string"
  }
  ```
- **响应**: 成功消息
- **业务逻辑**:
  1. 验证用户权限
  2. 删除 Conversation 实体
  3. 删除关联的所有 ChatMessage
  4. 可选：清理 Milvus 中的向量数据（如果有隔离）

#### 3.2.4 重命名对话 (PUT /api/rename/conversation)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.1.7
- **请求体**:
  ```json
  {
    "conversation_id": "string",
    "title": "string"
  }
  ```
- **响应**: 成功消息
- **业务逻辑**:
  1. 验证用户权限
  2. 更新 Conversation 的 title 字段
  3. 更新 updated_at 时间

#### 3.2.5 删除所有聊天记录 (POST /api/delete/chat)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.5.3 (用户设置中)
- **请求体**: `{}` (空对象)
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**: 成功消息
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 删除该用户的所有 Conversation 和 ChatMessage
  3. 可选：清理向量数据

### 3.3 消息历史功能

#### 3.3.1 查询消息列表 (POST /api/query/messages)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.1.3
- **请求体**:
  ```json
  {
    "conversation_id": "string"
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "current_id": "string",
      "messages": [
        {
          "message_id": "string",
          "message": {
            "author": { "role": "user" | "assistant" },
            "content": {
              "text": "string",
              "thinkText": "string" // 仅 assistant 消息
            },
            "status": "string",
            "thinking": boolean,
            "model": "string"
          },
          "conversation_id": "string",
          "parent": "string | null",
          "children": [],
          "created_at": "ISO 8601"
        }
      ]
    }
  }
  ```
- **业务逻辑**:
  1. 验证用户权限
  2. 查询对话的所有消息（按创建时间升序）
  3. 构建消息树结构（根据 parent 字段）
  4. 分离思考文本和回答文本（`</think>` 标记）
  5. 返回消息列表和当前消息ID（最新消息）

#### 3.3.2 获取最新消息ID (POST /api/get/latest/id)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.1.4 (流式响应结束后调用)
- **请求体**:
  ```json
  {
    "conversation_id": "string"
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "current_id": "string"
    }
  }
  ```
- **业务逻辑**:
  1. 验证用户权限
  2. 查询对话中最新消息的 messageId
  3. 返回最新消息ID

---

## 4. 技术优化建议

### 4.1 对话创建逻辑

**当前问题**: 首次对话时没有创建 Conversation 实体

**实施方案**:
1. 在 `ChatService.chatStream()` 中检查 `conversationId` 是否为空
2. 如果为空，创建新的 Conversation:
   ```java
   String conversationId = request.getConversation_id();
   if (conversationId == null || conversationId.isEmpty()) {
       Conversation newConv = Conversation.builder()
           .conversationId(UUID.randomUUID().toString())
           .userId(userId) // 从 JWT 获取
           .title(generateTitle(query)) // 从第一条消息生成标题
           .baseId(baseId)
           .currentNode(null)
           .isArchived(false)
           .createdAt(LocalDateTime.now())
           .updatedAt(LocalDateTime.now())
           .build();
       conversationRepository.save(newConv);
       conversationId = newConv.getConversationId();
   }
   ```

### 4.2 消息ID生成

**当前问题**: 使用简单时间戳

**优化方案**:
1. 使用 UUID: `UUID.randomUUID().toString()`
2. 或使用 Snowflake ID（与文档ID保持一致）

### 4.3 baseId 验证

**当前问题**: 没有验证 baseId 与用户的关系

**实施方案**:
1. 在 `ChatService.chatStream()` 开始处验证:
   ```java
   if (baseId != null) {
       KnowledgeBase kb = knowledgeBaseRepository.findById(baseId)
           .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found"));
       if (!kb.getUserId().equals(userId)) {
           throw new IllegalArgumentException("User does not have access to this knowledge base");
       }
   }
   ```

### 4.4 SSE 响应格式优化

**当前问题**: 响应格式与前端不匹配

**实施方案** (参考 `ChatService.java`):
```java
// 修改流式响应，包装为 JSON 格式
Flux<String> responseFlux = chatResponseFlux
    .map(chatResponse -> {
        String content = extractContent(chatResponse);
        // 转义 JSON 特殊字符
        String escapedContent = content
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
        return String.format("{\"type\":\"answer_chunk\",\"content\":\"%s\"}", escapedContent);
    })
    .concatWith(Flux.just("{\"type\":\"status\",\"message\":\"ANSWER_DONE\"}"));
```

### 4.5 思考过程支持

**实施方案**:
1. 检测 LLM 响应中的 `</think>` 标记
2. 分离两部分内容
3. 在存储 ChatMessage 时保存:
   ```java
   Map<String, Object> messageMap = new HashMap<>();
   messageMap.put("role", "assistant");
   messageMap.put("content", answerText);
   messageMap.put("thinkText", thinkText); // 思考文本
   messageMap.put("thinking", !thinkText.isEmpty());
   ```

---

## 5. 数据库设计

### 5.1 Conversation 实体 (已存在)
- **存储**: MongoDB
- **Collection**: `conversations`
- **字段**:
  - `conversationId` (String, @Id)
  - `userId` (Long)
  - `title` (String)
  - `currentNode` (String)
  - `baseId` (Long, nullable)
  - `defaultModel` (String)
  - `isArchived` (Boolean)
  - `createdAt` (LocalDateTime)
  - `updatedAt` (LocalDateTime)

### 5.2 ChatMessage 实体 (已存在)
- **存储**: MongoDB
- **Collection**: `chat_messages`
- **字段**:
  - `messageId` (String, @Id)
  - `conversationId` (String)
  - `message` (Map<String, Object>) - 包含 role, content, thinkText, thinking, model 等
  - `parent` (String, nullable)
  - `children` (List<String>)
  - `createdAt` (LocalDateTime)
  - `updatedAt` (LocalDateTime)

---

## 6. API 接口规范总结

| 接口 | 方法 | 路径 | 认证 | 状态 |
|------|------|------|------|------|
| 发送消息（SSE） | POST | `/api/new/message` | ✅ | ✅ 已实现（P0：补 baseId 隔离） |
| 获取对话信息 | GET | `/api/get/conversation/{id}` | ✅ | ✅ 已实现 |
| 查询消息列表 | POST | `/api/query/messages` | ✅ | ✅ 已实现（结构简化） |
| 获取最新消息ID | POST | `/api/get/latest/id` | ✅ | ✅ 已实现 |
| 查询对话列表 | GET | `/api/query/conversation` | ✅ | ✅ 已实现 |
| 删除对话 | POST | `/api/delete/conversation` | ✅ | ✅ 已实现 |
| 重命名对话 | PUT | `/api/rename/conversation` | ✅ | ✅ 已实现 |
| 删除所有聊天记录 | POST | `/api/delete/chat` | ✅ | ✅ 已实现 |

---

## 7. 前后端对接注意事项

1. **Token 认证**:
   - 所有接口需要 JWT token（除了 `/api/new/message` 可能允许匿名，但建议需要认证）
   - 请求头: `Authorization: {JWT_TOKEN}`

2. **流式响应**:
   - Content-Type: `text/event-stream`
   - 响应格式: JSON 对象流（每行一个 `data:` 前缀）
   - 事件类型: `answer_chunk`, `status`, `error`

3. **思考文本处理**:
   - 使用 `</think>` 标记分隔
   - 前端通过 `split('</think>')` 分离

4. **对话标题生成**:
   - 首次对话时，从第一条消息生成标题（截取前20-30字符）
   - 用户可手动重命名

5. **消息树结构**:
   - 通过 `parent` 字段构建消息链
   - 前端使用 `children` 字段（可选，当前 Go 后端未使用）

---

## 8. 开发优先级

1. **P0 (必须)**:
   - ✅ `/api/new/message` JSON 事件流
   - ✅ 对话创建逻辑
   - ✅ baseId ownership 校验（注意：检索隔离仍需补）
   - ✅ 消息ID使用 UUID
   - **补齐**：按 `baseId` 进行向量检索隔离（防串库）

2. **P1 (重要)**:
   - ✅ 获取对话信息 / 列表 / 消息列表 / latest id
   - 思考过程 `</think>` 支持
   - 消息结构对齐（thinking/model/thinkText）

3. **P2 (可选)**:
   - ✅ 删除对话 / 重命名 / 清空聊天
   - children 字段维护（消息树）
   - 对话分页、归档、搜索

---

**文档版本**: 1.0  
**最后更新**: 2026-01  
**维护者**: Java 后端开发团队

