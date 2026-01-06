# Spring AI 核心业务重构指南 (Java 版)

## 1. 项目背景
本项目旨在将原本依赖 Python/Go 的 RAG（检索增强生成）系统重构为 **纯 Java Spring Boot** 架构。
**核心目标**：实现“上传文档 -> 向量化存储 -> 检索 -> LLM 对话”的完整闭环，完全去除外部非 Java 依赖。

## 2. 核心业务流程 (Business Logic)

### A. 知识库构建 (Write Path)
**场景**：用户在前端上传 PDF/Markdown 资料。
**Java 处理流程**：
1.  **接收**：Controller 接收 `MultipartFile`。
2.  **解析 (ETL)**：
    * 利用 `Spring AI Tika` 读取文件流，转换为纯文本。
    * 利用 `TokenTextSplitter` 将长文本切分为 800 token 左右的片段 (Chunks)。
3.  **入库 (Vector Store)**：
    * 调用 `OllamaEmbeddingModel` (本地模型) 将文本片段转化为向量。
    * 将向量 + 原始文本存入 `Milvus` 数据库。
    * *注意*：每个 Document 需要携带 `filename` 等元数据 (Metadata)。

### B. 智能问答 (Read Path)
**场景**：用户在聊天框输入问题。
**Java 处理流程**：
1.  **检索 (Retrieval)**：
    * 将用户问题转化为向量。
    * 在 Milvus 中搜索最相似的 Top-4 文本片段。
2.  **提示词组装 (Prompting)**：
    * 使用系统提示词模板："你是一个智能助手。请根据以下参考资料回答问题：[参考资料]..."
    * 将检索到的片段填入 [参考资料]。
3.  **生成 (Generation)**：
    * 调用本地 Ollama (Llama3/DeepSeek) 模型。
    * **关键点**：必须使用 **Server-Sent Events (SSE)** 或 `Flux<String>` 返回流式响应，实现打字机效果。

## 3. 技术规范与注意事项

* **API 风格**：
    * 使用 Spring Boot 3.3 + JDK 21。
    * 严格遵循 Restful API 规范。
    * 使用 Lombok `@RequiredArgsConstructor` 进行构造器注入。
* **异常处理**：
    * 对于大模型超时、Milvus 连接失败等情况，必须抛出自定义异常，不能让前端一直转圈。
* **依赖组件**：
    * `spring-ai-milvus-store-spring-boot-starter`
    * `spring-ai-ollama-spring-boot-starter`
    * `spring-ai-tika-document-reader`

## 4. 调试验证信息
* **Ollama 地址**: `http://localhost:11434`
* **Milvus 地址**: `localhost:19530`
* **数据库**: PostgreSQL (`rag_db`) 用于存储非向量的业务元数据（如上传记录）。