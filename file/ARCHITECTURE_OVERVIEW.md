# 架构总览 (Architecture Overview)

## 1. 项目定位

本项目是一个 **RAG（Retrieval-Augmented Generation）企业知识库与智能问答系统**：
- **Write Path**：文档上传 → 解析 → 分片 → 向量化 → 写入 Milvus + 写入 PostgreSQL 元数据
- **Read Path**：用户提问 → 向量检索召回上下文 → Prompt 组装 → LLM 流式生成 → SSE 推送 → MongoDB 持久化对话历史

---

## 2. 技术栈与组件职责

### 2.1 Java 后端（主）
- **Spring Boot 3.4.1 / Java 17**
- **Spring AI**：
  - `ChatModel`：对接 Ollama 流式生成
  - `VectorStore (Milvus)`：向量写入与相似度检索
  - `TikaDocumentReader`：多格式文档文本抽取
  - `TokenTextSplitter`：文本分片
- **PostgreSQL**：用户 / 知识库 / 文档元数据（结构化）
- **MongoDB**：Conversation / ChatMessage（对话历史，便于树结构扩展）
- **Milvus**：向量数据（语义检索）
- **Redis**：邮箱验证码、重置 token
- **Spring Security + JWT**：无状态鉴权

### 2.2 Go 后端（历史/对照）
仓库中存在 `backend/`（Go + Gin）实现，主要用于早期版本或对照迁移。当前简历与主线开发建议以 **Java 后端**为准。

---

## 3. 数据流（关键路径）

### 3.1 Write Path：上传 → 向量化
1. `POST /api/knowledge/upload/file`
2. 创建 `Document` 记录（PostgreSQL，状态 `None`）
3. Tika 抽取文本
4. TokenTextSplitter 分片
5. 为每个 chunk 注入 metadata（docId/baseId/fileName/chunkIndex）并写入 Milvus（VectorStore.add）
6. 更新 `Document.status=Success` + `totalChunks`

### 3.2 Read Path：提问 → 检索 → 流式输出
1. `POST /api/new/message`（SSE）
2. 校验 baseId ownership（防越权）
3. Milvus 相似度检索 topK（召回上下文）
4. 拼装 system prompt（context + 规则）+ 历史消息（最近 N 条）
5. `ChatModel.stream` 流式生成
6. SSE 推送 `answer_chunk` / `status` 事件
7. 异步持久化消息到 MongoDB，更新 Conversation.currentNode

---

## 4. 关键设计决策（可写进简历/面试）

- **混合存储**：PostgreSQL 管元数据、MongoDB 管对话、Milvus 管向量，避免“一个数据库干所有事”的性能/建模妥协。
- **无状态鉴权**：JWT + Security FilterChain，方便水平扩展；`Authorization` 头不加 Bearer 前缀以匹配前端约定。
- **Milvus schema 自检**：启动时校验 embedding dimension，不一致自动重建 collection，避免线上插入失败。
- **流式体验**：SSE + JSON 事件协议，前端可实现打字机效果与状态机驱动 UI。

---

## 5. 已知风险与 Roadmap（架构层）

- **RAG 检索隔离（P0）**：当前检索未按 baseId 过滤，存在“串库”风险；需做 metadata 过滤或分集合。
- **向量生命周期管理（P0）**：删除文档/知识库/账号时 Milvus 向量未清理，易产生孤立数据与检索污染。
- **切片查询性能（P0/P1）**：`topK(10000)` 拉全量后内存过滤不可扩展，建议 Milvus Query/expr。


