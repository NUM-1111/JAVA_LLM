# Spring AI 核心业务重构指南 (Java 版)

## 1. 项目背景
本项目旨在将原本依赖 Python/Go 的 RAG（检索增强生成）系统重构为 **纯 Java Spring Boot** 架构。
**核心目标**：实现“上传文档 -> 向量化存储 -> 检索 -> LLM 对话”的完整闭环，完全去除外部非 Java 依赖。

## 2. 核心业务流程 (Business Logic)

### A. 知识库构建 (Write Path)
**场景**：用户在前端上传 PDF/Markdown/Word/Excel/PPT 等资料。
**Java 处理流程**：
1.  **接收**：`KnowledgeBaseController` 接收 `MultipartFile`、`baseId`、`userId`。
2.  **验证**：检查知识库是否存在，用户是否有权限访问。
3.  **数据库记录**：在 PostgreSQL 中创建 `Document` 实体，状态设为 `NONE`（使用 Snowflake ID 生成器）。
4.  **解析 (ETL)**：
    * 使用 `TikaDocumentReader` 配合 `InputStreamResource` 读取文件流，转换为纯文本。
    * 使用 `TokenTextSplitter`（默认参数）将长文本切分为片段 (Chunks)。
5.  **元数据注入**：为每个 chunk 添加元数据（`docId`、`baseId`、`fileName`）用于后续检索过滤。
6.  **入库 (Vector Store)**：
    * 调用 `VectorStore.add()` 自动触发 `OllamaEmbeddingModel`（qwen2.5:7b）将文本片段转化为向量。
    * 将向量 + 原始文本 + 元数据存入 `Milvus` 数据库。
7.  **完成**：更新 PostgreSQL 中 Document 实体状态为 `SUCCESS`，记录 `totalChunks`。
8.  **错误处理**：如失败，更新状态为 `FAILURE` 并抛出异常。

### B. 智能问答 (Read Path)
**场景**：用户在聊天框输入问题。
**Java 处理流程**：
1.  **检索 (Retrieval)**：
    * 使用 `VectorStore.similaritySearch()` 将用户问题转化为向量并搜索。
    * 在 Milvus 中搜索最相似的 Top-4 文本片段（`topK=4`，`similarityThreshold=0.7`）。
2.  **上下文组装**：将检索到的片段用 `\n\n---\n\n` 分隔符连接成上下文字符串。
3.  **提示词组装 (Prompting)**：
    * 使用系统提示词模板："You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, say so.\n\nContext:\n{context}"
    * 将检索到的片段填入上下文。
4.  **历史集成**：如果提供了 `conversationId`，从 MongoDB 加载最近 5 条消息并加入消息列表。
5.  **生成 (Generation)**：
    * 使用 `ChatModel.stream()` 调用本地 Ollama (qwen2.5:7b) 模型。
    * **关键点**：必须使用 **Server-Sent Events (SSE)** 或 `Flux<String>` 返回流式响应，实现打字机效果。
6.  **持久化**：异步将用户消息和助手回复保存到 MongoDB（如果提供了 conversationId）。

## 3. 技术规范与注意事项

* **技术栈**：
    * Spring Boot 3.4.1 + JDK 17
    * Spring AI 1.0.3
    * PostgreSQL（业务元数据）+ MongoDB（聊天历史）
    * Snowflake ID 生成器（用于分布式 ID）
* **API 风格**：
    * 严格遵循 Restful API 规范。
    * 使用 Lombok `@RequiredArgsConstructor` 进行构造器注入。
    * 使用 `@Transactional` 管理多步骤数据库操作。
* **异常处理**：
    * 对于大模型超时、Milvus 连接失败等情况，必须抛出自定义异常（`ResourceNotFoundException`、`IllegalArgumentException`），不能让前端一直转圈。
* **依赖组件**：
    * `spring-ai-starter-model-ollama` - Ollama 集成
    * `spring-ai-starter-vector-store-milvus` - Milvus 向量存储
    * `spring-ai-tika-document-reader` - 文档解析
    * `spring-boot-starter-data-jpa` - PostgreSQL JPA
    * `spring-boot-starter-data-mongodb` - MongoDB 聊天历史
* **命名规范**：
    * 注意区分 `com.heu.rag.core.domain.Document`（PostgreSQL 实体）和 `org.springframework.ai.document.Document`（Spring AI 向量文档），必要时使用完整包名。

## 4. 调试验证信息
* **Ollama 地址**: `http://localhost:11434`
  * **聊天模型**: `qwen2.5:7b`
  * **嵌入模型**: `qwen2.5:7b`
  * **嵌入维度**: `4096`
* **Milvus 地址**: `localhost:19530`
* **PostgreSQL**: 
  * URL: `jdbc:postgresql://localhost:5432/rag_db`
  * 用户: `rag_user`
  * 密码: `rag_password`
  * 用途: 存储知识库、文档等业务元数据
* **MongoDB**: 
  * URI: `mongodb://localhost:27017/rag_chat_history`
  * 用途: 存储聊天对话历史记录

## 5. 已实现的 API 端点
* `POST /api/knowledge/upload/file` - 上传并处理文件（需要 file, baseId, userId 参数）
* `POST /api/new/message` - 发送聊天消息（返回 SSE 流式响应）
* `GET /api/knowledge/list` - 获取知识库列表（需要 userId 参数）
* `DELETE /api/knowledge/delete/{id}` - 删除知识库
* `GET /api/knowledge/document/list` - 获取知识库中的文档列表（需要 baseId 参数）