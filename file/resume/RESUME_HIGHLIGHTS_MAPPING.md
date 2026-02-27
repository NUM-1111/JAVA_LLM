# 简历亮点映射 (Resume Highlights Mapping)

> 目的：把“简历上的亮点”落到“代码证据/可讲的难点/下一步 Roadmap”，避免面试被追问时失分。

---

## 1. 已落地（可在简历中直接写，面试能讲清）

### 1.1 混合存储架构（PostgreSQL + MongoDB + Milvus）
- **你可以怎么写**：设计并落地混合存储，分别承载结构化元数据 / 对话历史 / 向量数据，降低单库建模复杂度并提升扩展性。
- **代码证据**：
  - PostgreSQL：JPA entities + repositories（KnowledgeBase/Document/User）
  - MongoDB：Conversation/ChatMessage repositories
  - Milvus：Spring AI VectorStore（Milvus）+ `MilvusConfig` 启动自检

### 1.2 高性能 RAG 链路（Spring AI + Milvus + Ollama）
- **你可以怎么写**：基于 Spring AI 构建“召回→Prompt→生成→持久化”的 RAG Pipeline，支持 topK 检索与阈值过滤，并流式输出结果。
- **代码证据**：
  - `ChatService.chatStream()`：检索 + Prompt + stream + Mongo 持久化
  - `ChatController`：SSE 输出 JSON 事件流

### 1.3 流式体验（SSE + Reactor Flux）
- **你可以怎么写**：使用 Reactor Flux 实现 SSE 推送，前端可实现打字机效果；首帧返回 conversation_id，便于前端状态机对齐。
- **代码证据**：
  - `ChatController` / `ChatService` 的 `text/event-stream` 实现

### 1.4 安全与鉴权（Spring Security + JWT + BCrypt）
- **你可以怎么写**：集成 Spring Security + JWT 实现无状态鉴权，自定义 Filter 从 Authorization 头解析 token；注册/登录使用 BCrypt 加密与校验。
- **代码证据**：
  - `SecurityConfig` / `JwtAuthenticationFilter` / `JwtTokenUtil`
  - `AuthController`：登录/注册/重置密码

### 1.5 邮箱验证码与密码重置（Redis + Mail）
- **你可以怎么写**：实现邮箱验证码发放与校验、密码重置 token 签发与过期控制；使用 Redis TTL 管理验证码与 token 生命周期。
- **代码证据**：
  - `EmailService`：`email:code:{email}` / `reset:token:{email}` / `reset:token:value:{token}`
  - `EMAIL_VERIFICATION_TOGGLE.md`：开发/生产切换

---

## 2. 已解决的技术难点（可作为简历亮点）✅

### 2.1 向量生命周期管理 ✅
- **解决方案**：实现了删除文档/知识库/账号时自动清理 Milvus 向量数据
- **技术实现**：引入 Milvus Java SDK，实现 `MilvusService.deleteChunksByDocId()`，使用 metadata 过滤删除
- **代码证据**：`MilvusService`、`DocumentService.deleteDocument()`、`KnowledgeBaseController.deleteKnowledgeBase()`、`UserSettingsController.deleteAccount()`
- **你可以怎么写**：设计并实现了向量数据的完整生命周期管理，确保删除操作时自动清理 Milvus 中的向量数据，避免孤立数据和存储浪费。

### 2.2 RAG 检索隔离 ✅
- **解决方案**：实现了按 baseId 和 isEnabled 过滤的相似度检索，避免跨知识库召回
- **技术实现**：使用 Milvus Query API + JSON_EXTRACT 表达式实现 metadata 过滤
- **代码证据**：`MilvusService.similaritySearchWithBaseId()`、`ChatService.chatStream()`
- **你可以怎么写**：实现了多租户 RAG 检索隔离，通过 Milvus metadata 过滤确保检索结果严格按知识库隔离，防止数据泄露。

### 2.3 切片查询性能优化 ✅
- **解决方案**：使用 Milvus Query API 替代 topK(10000) 全量扫描，支持分页查询
- **技术实现**：实现 `MilvusService.queryChunksByDocId()`，使用 Query API + limit/offset 分页
- **代码证据**：`MilvusService.queryChunksByDocId()`、`DocumentService.getDocumentChunks()`
- **你可以怎么写**：优化了文档切片查询性能，从全量扫描改为按 docId 精确查询并支持分页，显著降低内存占用和查询延迟。

---

## 3. Roadmap（写成“下一阶段规划”，与简历可量化点对齐）

### 3.1 Redis + Lua 限流（验证码防刷 / API 限流）
- **目标**：邮件验证码接口防刷、避免资源被打爆
- **落地方式**：Lua 脚本实现原子自增 + TTL + 阈值判断

### 3.2 Milvus SDK 接入（删除 + metadata 过滤查询）✅ 已完成
- **目标**：补齐删除闭环、优化切片查询性能、实现 baseId/docId 过滤
- **落地方式**：已实现 `MilvusService`（Query/Delete），并在 Document/KB/User 删除路径集成
- **状态**：已完成，详见 `file/milvus/MILVUS_IMPLEMENTATION_STATUS.md`

### 3.3 思考过程与消息树
- **目标**：支持 `</think>` 解析与返回、完善 children 字段维护，形成可追溯的对话树

---

## 4. 建议你简历里“措辞更稳”的写法（避免被追问打脸）

- 对“百万级向量、毫秒级检索”等性能指标：如果没有压测数据，建议写成  
  - “支持 Milvus IVF_FLAT + COSINE 检索，并预留百万级向量规模的索引与过滤优化方案（Milvus SDK 方案）”
- 对“CompletableFuture 解耦/降低 40% 延迟”等：若当前代码未体现，请放入 Roadmap 或改写为  
  - “通过 Reactor Flux 流式输出 + 异步持久化（fire-and-forget）减少接口阻塞”


