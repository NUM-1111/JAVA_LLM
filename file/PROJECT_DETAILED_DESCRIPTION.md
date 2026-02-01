# 项目详细描述文档 (Project Detailed Description)

> 本文档提供项目的全面技术描述，供功能性AI（如代码分析、架构评估、功能扩展等）使用。

**文档版本**: 1.0  
**最后更新**: 2026-01  
**项目名称**: Go_LLM_Web (Java RAG Backend)

---

## 1. 项目概述

### 1.1 项目定位
本项目是一个**企业级 RAG（Retrieval-Augmented Generation）知识库与智能问答系统**，采用 Spring Boot + Spring AI 构建，支持多格式文档上传、向量化存储、语义检索和流式对话生成。

### 1.2 核心功能
- **知识库管理**：创建、编辑、搜索知识库
- **文档处理**：支持 PDF、Word、Excel、TXT 等多种格式，自动解析、分片、向量化
- **智能问答**：基于 RAG 的流式对话，支持上下文检索和对话历史管理
- **用户系统**：JWT 认证、邮箱验证、密码重置、账号管理

### 1.3 技术特点
- **混合存储架构**：PostgreSQL（元数据）+ MongoDB（对话历史）+ Milvus（向量数据）
- **流式响应**：SSE（Server-Sent Events）实现实时对话体验
- **检索隔离**：按知识库（baseId）和文档状态（isEnabled）过滤，避免数据泄露
- **向量生命周期管理**：删除操作自动清理 Milvus 向量数据

---

## 2. 技术栈详情

### 2.1 后端框架
- **Spring Boot**: 3.4.1
- **Java**: 17
- **Spring AI**: 1.0.3
  - `spring-ai-starter-model-ollama`: 对接 Ollama LLM
  - `spring-ai-starter-vector-store-milvus`: Milvus 向量存储
  - `spring-ai-tika-document-reader`: 文档解析
- **Spring Security**: JWT 认证
- **Spring Data JPA**: PostgreSQL ORM
- **Spring Data MongoDB**: MongoDB 操作
- **Spring Data Redis**: 验证码存储

### 2.2 数据库与存储
- **PostgreSQL** (端口 5433)
  - 存储：User, KnowledgeBase, Document 实体
  - 特点：使用 Snowflake ID 作为主键
- **MongoDB** (端口 27017)
  - 存储：Conversation, ChatMessage 文档
  - 特点：支持树结构对话（parent/children）
- **Milvus** (端口 19530)
  - 存储：文档切片向量（embedding dimension: 3584）
  - Collection: `vector_store`
  - Metadata: JSON 格式，包含 baseId, docId, isEnabled, chunkIndex
- **Redis** (端口 6379)
  - 存储：邮箱验证码、密码重置 token
  - 过期时间：验证码 5 分钟，重置 token 15 分钟

### 2.3 LLM 与 Embedding
- **Ollama**: 本地部署
  - 模型：`qwen2.5:7b`
  - 用途：Chat（流式生成）+ Embedding（向量化）
  - Embedding 维度：3584

### 2.4 工具库
- **Lombok**: 减少样板代码
- **Hutool**: 工具类库
- **JJWT**: JWT 生成与验证
- **Apache Tika**: 文档文本抽取

---

## 3. 项目结构

### 3.1 包结构
```
com.heu.rag/
├── RagApplication.java              # 主启动类
├── common/                           # 通用组件
│   └── Result.java                  # 统一响应包装
├── config/                          # 配置类
│   ├── SecurityConfig.java          # Spring Security 配置
│   ├── JwtAuthenticationFilter.java # JWT 认证过滤器
│   ├── MilvusConfig.java            # Milvus 集合配置
│   ├── CorsConfig.java              # CORS 配置
│   └── SnowflakeIdGenerator.java    # ID 生成器
├── core/
│   ├── controller/                  # REST 控制器
│   │   ├── AuthController.java      # 认证相关
│   │   ├── ChatController.java      # 对话接口（SSE）
│   │   ├── ConversationController.java # 对话管理
│   │   ├── KnowledgeBaseController.java # 知识库管理
│   │   ├── DocumentController.java  # 文档管理
│   │   └── UserSettingsController.java # 用户设置
│   ├── service/                     # 业务逻辑层
│   │   ├── ChatService.java         # RAG 对话服务
│   │   ├── KnowledgeBaseService.java # 知识库服务（含上传）
│   │   ├── DocumentService.java     # 文档服务
│   │   ├── MilvusService.java       # Milvus 直接操作
│   │   └── EmailService.java        # 邮件服务
│   ├── repository/                   # 数据访问层
│   │   ├── UserRepository.java
│   │   ├── KnowledgeBaseRepository.java
│   │   ├── DocumentRepository.java
│   │   ├── ConversationRepository.java
│   │   └── ChatMessageRepository.java
│   ├── domain/                       # 实体类
│   │   ├── User.java                # PostgreSQL 实体
│   │   ├── KnowledgeBase.java       # PostgreSQL 实体
│   │   ├── Document.java            # PostgreSQL 实体
│   │   ├── Conversation.java        # MongoDB 文档
│   │   └── ChatMessage.java         # MongoDB 文档
│   ├── controller/dto/              # 请求/响应 DTO
│   └── util/                        # 工具类
│       ├── JwtTokenUtil.java        # JWT 工具
│       └── EmailValidator.java     # 邮箱验证
└── exception/                       # 异常处理
    └── ResourceNotFoundException.java
```

### 3.2 前端结构（React）
```
frontend/
├── src/
│   ├── components/
│   │   ├── user/                    # 用户相关组件
│   │   ├── NewChat.jsx              # 新对话页面
│   │   ├── Conversation.jsx         # 对话页面
│   │   ├── KnowBase.jsx             # 知识库页面
│   │   └── DatasetPage.jsx          # 数据集页面
│   └── App.jsx                      # 路由配置
```

---

## 4. 核心业务流程

### 4.1 用户认证流程
1. **注册** (`POST /api/register`)
   - 验证邮箱格式（@hrbeu.edu.cn）
   - 可选邮箱验证码（`email.verification.enabled` 控制）
   - BCrypt 加密密码
   - 生成 JWT token 自动登录

2. **登录** (`POST /api/login`)
   - 支持用户名或邮箱登录
   - BCrypt 验证密码
   - 返回 JWT token

3. **JWT 认证**
   - `JwtAuthenticationFilter` 拦截请求
   - 从 `Authorization` 头提取 token（无 Bearer 前缀）
   - 验证 token 并设置 `SecurityContext`
   - Controller 通过 `SecurityContextHolder` 获取 userId

### 4.2 文档上传与向量化流程（Write Path）
1. **上传** (`POST /api/knowledge/upload/file`)
   - 验证 baseId 所有权
   - 创建 Document 记录（状态：None）
   - 保存文件到本地

2. **解析** (`KnowledgeBaseService.uploadAndProcess`)
   - 使用 TikaDocumentReader 抽取文本
   - 支持 PDF、Word、Excel、TXT 等格式

3. **分片** (`TokenTextSplitter`)
   - 按 token 数量分片（默认配置）
   - 生成多个 Document chunk

4. **向量化**
   - 为每个 chunk 生成 embedding（qwen2.5:7b）
   - 注入 metadata：`{baseId, docId, fileName, chunkIndex, isEnabled}`
   - 写入 Milvus（通过 Spring AI VectorStore）

5. **更新状态**
   - 更新 Document.status = Success
   - 记录 totalChunks

### 4.3 RAG 对话流程（Read Path）
1. **接收请求** (`POST /api/new/message`, SSE)
   - 从 SecurityContext 获取 userId
   - 验证 baseId 所有权

2. **向量检索** (`ChatService.chatStream`)
   - 使用 `MilvusService.similaritySearchWithBaseId()`
   - 过滤条件：`baseId == {baseId} && isEnabled == 'true'`
   - 返回 topK 相似文档（默认 topK=4, threshold=0.7）

3. **Prompt 组装**
   - System prompt：包含检索到的上下文 + 规则
   - 历史消息：从 MongoDB 获取最近 N 条
   - 用户问题：作为 user message

4. **流式生成** (`ChatModel.stream`)
   - 调用 Ollama 流式生成
   - 逐 chunk 返回

5. **SSE 推送**
   - 事件类型：
     - `conversation_id`: 新对话 ID
     - `answer_chunk`: 答案片段
     - `status`: 完成状态
     - `error`: 错误信息

6. **持久化**
   - 异步保存消息到 MongoDB
   - 更新 Conversation.currentNode

### 4.4 删除流程（向量清理）
1. **删除文档** (`POST /api/knowledge/delete/document`)
   - 调用 `MilvusService.deleteChunksByDocId()`
   - 使用 Milvus Delete API + metadata 过滤
   - 删除 PostgreSQL Document 记录

2. **删除知识库** (`DELETE /api/knowledge/delete/{baseId}`)
   - 遍历所有文档，逐个清理向量
   - 删除所有 Document 记录
   - 删除 KnowledgeBase 记录

3. **注销账号** (`POST /api/delete/account`)
   - 遍历所有知识库和文档
   - 清理所有向量数据
   - 级联删除所有相关数据

---

## 5. 关键实现细节

### 5.1 Milvus 操作
**直接使用 Milvus Java SDK**（而非仅依赖 Spring AI VectorStore），原因：
- 需要 metadata 过滤（baseId, docId, isEnabled）
- 需要精确删除（按 docId 删除向量）
- 需要查询优化（避免 topK 全量扫描）

**核心方法** (`MilvusService`):
- `similaritySearchWithBaseId()`: 带过滤的相似度检索
- `queryChunksByDocId()`: 按 docId 查询切片（分页）
- `deleteChunksByDocId()`: 按 docId 删除向量
- `countChunksByDocId()`: 统计切片数量

**Metadata 格式**:
```json
{
  "baseId": "123456789",
  "docId": "987654321",
  "fileName": "example.pdf",
  "chunkIndex": 0,
  "isEnabled": "true"
}
```

**过滤表达式**:
```java
String filterExpr = String.format(
    "JSON_EXTRACT(%s, '$.baseId') == '%s' && JSON_EXTRACT(%s, '$.isEnabled') == 'true'",
    METADATA_FIELD, baseId, METADATA_FIELD);
```

### 5.2 JWT 认证实现
**Token 生成** (`JwtTokenUtil`):
- 算法：HS256
- Claims: `userId`, `username`
- 过期时间：24 小时（可配置）

**认证过滤器** (`JwtAuthenticationFilter`):
- 拦截路径：`/api/**`（排除 `/api/login`, `/api/register`）
- 提取 token：从 `Authorization` 头（无 Bearer 前缀）
- 设置 SecurityContext：将 userId 作为 Principal

**Controller 获取用户**:
```java
private Long getUserIdFromContext() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return (Long) auth.getPrincipal();
}
```

### 5.3 SSE 流式响应
**Content-Type**: `text/event-stream`

**事件格式**:
```
data: {"type":"conversation_id","conversation_id":"..."}\n\n
data: {"type":"answer_chunk","content":"..."}\n\n
data: {"type":"status","message":"ANSWER_DONE"}\n\n
```

**实现** (`ChatController`):
```java
@PostMapping(value = "/new/message", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<String> newMessage(@RequestBody ChatRequest request) {
    return chatService.chatStream(...)
        .map(json -> "data: " + json + "\n\n");
}
```

### 5.4 邮箱验证码
**存储**: Redis（key: `email:code:{email}`, value: 验证码）

**过期时间**: 5 分钟（可配置）

**功能开关**: `email.verification.enabled`（默认 false，开发模式）

**流程**:
1. `POST /api/send/email` → 生成 6 位数字验证码，发送邮件，存储到 Redis
2. `POST /api/checkcode` → 验证码校验，生成重置 token
3. `POST /api/reset/password` → 使用重置 token 修改密码

---

## 6. 数据模型

### 6.1 PostgreSQL 实体

**User**:
- `id` (Long, 自增)
- `username` (String, 唯一)
- `email` (String, 唯一, @hrbeu.edu.cn)
- `password` (String, BCrypt 加密)
- `createdAt` (LocalDateTime)

**KnowledgeBase**:
- `baseId` (Long, Snowflake ID)
- `userId` (Long, 外键)
- `baseName` (String)
- `baseDesc` (String, 可选)
- `createdAt`, `updatedAt` (LocalDateTime)

**Document**:
- `docId` (Long, Snowflake ID)
- `baseId` (Long, 外键)
- `docName` (String)
- `fileSuffix` (String)
- `fileType` (FileType 枚举)
- `filePath` (String)
- `isEnabled` (Boolean, 默认 true)
- `status` (ParseStatus 枚举: None, Processing, Success, Failed)
- `totalChunks` (Integer)
- `createdAt`, `updatedAt` (LocalDateTime)

### 6.2 MongoDB 文档

**Conversation**:
- `conversationId` (String, UUID)
- `userId` (Long)
- `title` (String)
- `currentNode` (String, 最新消息 ID)
- `baseId` (Long, 关联知识库)
- `defaultModel` (String)
- `isArchived` (Boolean)
- `createdAt`, `updatedAt` (LocalDateTime)

**ChatMessage**:
- `messageId` (String, UUID)
- `conversationId` (String)
- `message` (Map<String, Object>, 包含 role/content)
- `parent` (String, 父消息 ID)
- `children` (List<String>, 子消息 ID 列表)
- `createdAt`, `updatedAt` (LocalDateTime)

### 6.3 Milvus Collection Schema

**Collection**: `vector_store`

**Fields**:
- `id` (VARCHAR, 主键, 手动指定)
- `content` (VARCHAR, 文本内容)
- `embedding` (FLOAT_VECTOR, 维度 3584)
- `metadata_json` (VARCHAR, JSON 格式元数据)

---

## 7. API 端点清单

### 7.1 认证模块 (`/api`)
- `POST /api/login` - 登录
- `POST /api/register` - 注册
- `POST /api/send/email` - 发送验证码
- `POST /api/checkcode` - 验证验证码
- `POST /api/reset/password` - 重置密码

### 7.2 知识库模块 (`/api/knowledge`)
- `POST /api/knowledge/create` - 创建知识库
- `GET /api/knowledge/list` - 获取知识库列表
- `GET /api/knowledge/info/{baseId}` - 获取知识库详情
- `PUT /api/knowledge/edit/{baseId}` - 编辑知识库
- `POST /api/knowledge/search` - 搜索知识库
- `DELETE /api/knowledge/delete/{baseId}` - 删除知识库（含向量清理）
- `POST /api/knowledge/upload/file` - 上传文档（兼容路由）

### 7.3 文档模块 (`/api/knowledge/document`)
- `GET /api/knowledge/document/list` - 文档列表（分页+搜索）
- `GET /api/knowledge/document/{docId}` - 文档信息
- `GET /api/knowledge/document/detail` - 文档切片详情（已优化）
- `POST /api/knowledge/document/change/status` - 修改启用状态
- `POST /api/knowledge/document/rename` - 重命名文档
- `POST /api/knowledge/delete/document` - 删除文档（含向量清理）

### 7.4 对话模块 (`/api`)
- `POST /api/new/message` - 发送消息（SSE 流式）
- `GET /api/get/conversation/{conversationId}` - 获取对话信息
- `GET /api/query/conversation` - 查询对话列表
- `POST /api/query/messages` - 查询消息列表
- `POST /api/get/latest/id` - 获取最新消息 ID
- `POST /api/delete/conversation` - 删除对话
- `PUT /api/rename/conversation` - 重命名对话
- `POST /api/delete/chat` - 删除所有聊天记录

### 7.5 用户设置模块 (`/api`)
- `POST /api/change/username` - 修改用户名
- `POST /api/change/email` - 修改邮箱
- `GET /api/user/info` - 获取用户信息
- `POST /api/delete/account` - 注销账号（含向量清理）
- `POST /api/user-settings/delete/chat` - 清空聊天记录（备用路由）

---

## 8. 配置说明

### 8.1 应用配置 (`application.yml`)
- **端口**: 8081
- **文件上传**: 最大 100MB
- **PostgreSQL**: localhost:5433
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **Milvus**: localhost:19530
- **Ollama**: localhost:11434
- **JWT**: 密钥和过期时间可配置
- **邮箱**: SMTP 配置（支持环境变量）

### 8.2 环境变量
- `HEU_SMTP_PASSWORD`: SMTP 密码（建议使用）
- `JWT_SECRET`: JWT 密钥（建议使用）

### 8.3 Docker Compose
包含服务：
- PostgreSQL (端口映射 5433:5432)
- MongoDB (27017)
- Redis (6379)
- Milvus Standalone (19530, 依赖 etcd + MinIO)

---

## 9. 已实现的关键优化

### 9.1 RAG 检索隔离 ✅
- 实现位置：`MilvusService.similaritySearchWithBaseId()`
- 技术方案：Milvus Query API + JSON_EXTRACT 表达式
- 过滤条件：`baseId == {baseId} && isEnabled == 'true'`
- 效果：避免跨知识库检索，防止数据泄露

### 9.2 向量生命周期管理 ✅
- 实现位置：`MilvusService.deleteChunksByDocId()`
- 触发场景：删除文档、删除知识库、注销账号
- 技术方案：Milvus Delete API + metadata 过滤
- 效果：避免孤立向量数据，节省存储空间

### 9.3 切片查询优化 ✅
- 实现位置：`MilvusService.queryChunksByDocId()`
- 优化前：`topK(10000)` 全量扫描后内存过滤
- 优化后：Milvus Query API + 分页（limit/offset）
- 效果：降低内存占用，提升查询性能

---

## 10. 待优化项

### 10.1 P1 优先级
- **邮件验证码防刷**：添加 Redis 计数或 Lua 原子限流
- **文档状态变更**：禁用文档后，Milvus 旧向量仍参与检索（需重新上传或实现 metadata 更新）

### 10.2 P2 优先级
- **敏感配置治理**：SMTP/JWT secret 全部走环境变量
- **Token 体验**：refresh token、登出、黑名单（可选）
- **操作审计**：关键操作（删除、修改）记录日志

---

## 11. 开发与部署

### 11.1 本地开发
1. 启动依赖服务：`docker compose up -d`
2. 准备 Ollama：`ollama pull qwen2.5:7b`
3. 启动后端：`./mvnw spring-boot:run`
4. 启动前端：`cd frontend && pnpm install && pnpm run dev`

### 11.2 关键配置检查
- Milvus embedding dimension: 3584（与 qwen2.5:7b 一致）
- Milvus field names: `id`, `metadata_json`（与 MilvusConfig 一致）
- Redis 密码：与 docker-compose 一致
- 邮箱验证码开关：`email.verification.enabled`

---

## 12. 技术亮点（简历/面试）

1. **混合存储架构**：PostgreSQL + MongoDB + Milvus，各司其职
2. **RAG 检索隔离**：使用 Milvus Query API + JSON 表达式实现多租户隔离
3. **向量生命周期管理**：删除操作自动清理向量，避免数据泄露和存储浪费
4. **流式对话体验**：SSE + React 实现实时打字机效果
5. **无状态认证**：JWT + Spring Security，支持水平扩展
6. **文档处理能力**：支持多格式文档解析、智能分片、向量化

---

**文档维护者**: Java 后端开发团队  
**参考文档**: 见 `file/PROJECT_INDEX.md`

