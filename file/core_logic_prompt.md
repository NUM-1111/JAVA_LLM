# Role: Java Senior Backend Developer (Spring AI Specialist)

# Context:
We are refactoring a legacy Go-based RAG system into a **High-Quality Java Spring Boot Application**.
The goal is to build the "Core Business Domain" using **Spring AI** to replace the old Python/Go logic.
We need to handle Document Parsing, Vector Embedding, and Chat with LLM (Ollama) in a clean, enterprise-grade architecture.

# Technical Stack:
- **Java**: 17 (LTS)
- **Framework**: Spring Boot 3.4.1
- **AI Framework**: Spring AI 1.0.3
- **Vector DB**: Milvus (Reuse existing Docker infrastructure)
- **LLM**: Ollama (Running locally, using Qwen2.5:7b model)
- **Build Tool**: Maven
- **Additional**: MongoDB for chat history storage, Snowflake ID generator

# Requirements:

## 1. Project Scaffolding
- Create a clean directory structure following DDD (Domain-Driven Design) partially:
  - `com.heu.rag.core.domain` (Entities)
  - `com.heu.rag.core.service` (Business Logic)
  - `com.heu.rag.core.controller` (REST API)
  - `com.heu.rag.config` (Configuration)
- **Configuration**:
  - Use `application.yml`.
  - Configure `spring.ai.ollama.base-url` (Allow it to be configurable for remote connection).
  - Configure Milvus connection details.
- **Infrastructure Connection Details (Verified)**:
- **PostgreSQL**:
  - URL: jdbc:postgresql://localhost:5432/rag_db
  - User: rag_user
  - Pass: rag_password
- **Redis**:
  - Host: localhost
  - Port: 6379
  - Pass: redis_password
- **Milvus**:
  - Host: localhost
  - Port: 19530
  - Database: default
- **Ollama**:
  - Base URL: http://localhost:11434 (Use `host.docker.internal` if running app inside docker later)
  - Chat Model: qwen2.5:7b
  - Embedding Model: qwen2.5:7b
  - Embedding Dimension: 4096
- **MongoDB**:
  - URI: mongodb://localhost:27017/rag_chat_history
  - Purpose: Store chat conversation history

## 2. Core Service: KnowledgeBaseService (The "Write" Path)
- **Goal**: Handle file upload and vectorization.
- **Input**: MultipartFile (PDF/TXT/MD/DOCX/XLSX/PPTX), baseId, userId.
- **Process**:
  1.  **Validation**: Check if KnowledgeBase exists and user has access.
  2.  **DB Entry**: Save a new `Document` entity to PostgreSQL with status `NONE` (using Snowflake ID).
  3.  **Reader**: Use Spring AI's `TikaDocumentReader` with `InputStreamResource` to extract text.
  4.  **Splitter**: Use `TokenTextSplitter` (default parameters) to chunk text into segments.
  5.  **Metadata Injection**: Add metadata to each chunk (docId, baseId, fileName) for filtering.
  6.  **Storage**: Store the chunks into Milvus using Spring AI's `VectorStore.add()` (automatically calls Ollama Embedding).
  7.  **Completion**: Update Document entity status to `SUCCESS` and set `totalChunks`.
- **Error Handling**: On failure, update status to `FAILURE` and throw exception.
- **Output**: Method returns void; Controller returns success response with docId.

## 3. Core Service: ChatService (The "Read" Path)
- **Goal**: RAG-based Chat with Streaming support.
- **Input**: User query (String), Conversation ID (optional).
- **Process**:
  1.  **Retrieve**: Search Milvus for top-k similar chunks using `VectorStore.similaritySearch()` with:
      - `topK = 4`
      - `similarityThreshold = 0.7`
  2.  **Context Assembly**: Concatenate retrieved chunks into context string (separated by `\n\n---\n\n`).
  3.  **Prompt Engineering**: Construct a System Prompt with context:
      > "You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, say so.\n\nContext:\n{context}"
  4.  **History Integration**: If conversationId exists, load last 5 messages from MongoDB and add to message list.
  5.  **Generate**: Use `ChatModel.stream()` to call Ollama with streaming support.
  6.  **Persistence**: Asynchronously save user message and assistant response to MongoDB (if conversationId provided).
- **Output**: Return `Flux<String>` for Server-Sent Events (SSE) streaming.
- **Dependencies**: `ChatModel` (not ChatClient), `VectorStore`, `ChatMessageRepository`, `ConversationRepository`.

## 4. Coding Standards (Critical for Interview)
- **Don't use low-level HTTP clients**: MUST use Spring AI's high-level abstractions (`ChatModel`, `VectorStore`, `TikaDocumentReader`, `TokenTextSplitter`).
- **Dependency Injection**: Use Constructor Injection (`@RequiredArgsConstructor` from Lombok).
- **Logging**: Add Slf4j logs for key steps (e.g., "Retrieved {} chunks for query", "Streaming completed for query").
- **Error Handling**: Throw custom exceptions (`ResourceNotFoundException`, `IllegalArgumentException`) and handle failures gracefully.
- **Transaction Management**: Use `@Transactional` for multi-step database operations.
- **Document Naming**: Distinguish between `com.heu.rag.core.domain.Document` (PostgreSQL entity) and `org.springframework.ai.document.Document` (Spring AI vector document) using full package names when needed.

# Implementation Status:
✅ **Completed**: The following classes have been implemented:
- `KnowledgeBaseService.java` - Handles file upload, parsing, chunking, and vectorization
- `ChatService.java` - Handles RAG-based chat with streaming and history support
- `KnowledgeBaseController.java` - REST API for knowledge base CRUD and file upload
- `ChatController.java` - REST API for chat with SSE streaming support

# Key Dependencies (pom.xml):
- `spring-ai-starter-model-ollama` - Ollama integration
- `spring-ai-starter-vector-store-milvus` - Milvus vector store
- `spring-ai-tika-document-reader` - Document parsing
- `spring-boot-starter-data-jpa` - PostgreSQL JPA
- `spring-boot-starter-data-mongodb` - MongoDB for chat history
- `hutool-all` - Utilities (Snowflake ID generator)

# API Endpoints:
- `POST /api/knowledge/upload/file` - Upload and process file
- `POST /api/new/message` - Send chat message (returns SSE stream)
- `GET /api/knowledge/list` - List knowledge bases
- `DELETE /api/knowledge/delete/{id}` - Delete knowledge base
- `GET /api/knowledge/document/list` - List documents in a knowledge base