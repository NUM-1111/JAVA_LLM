# Role: Java Senior Backend Developer (Spring AI Specialist)

# Context:
We are refactoring a legacy Go-based RAG system into a **High-Quality Java Spring Boot Application**.
The goal is to build the "Core Business Domain" using **Spring AI** to replace the old Python/Go logic.
We need to handle Document Parsing, Vector Embedding, and Chat with LLM (Ollama) in a clean, enterprise-grade architecture.

# Technical Stack:
- **Java**: 21 (LTS)
- **Framework**: Spring Boot 3.3.x
- **AI Framework**: Spring AI (0.8.1 or 1.0.0-snapshot)
- **Vector DB**: Milvus (Reuse existing Docker infrastructure)
- **LLM**: Ollama (Running locally, mimicking a private inference server)
- **Build Tool**: Maven

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
  ## Infrastructure Connection Details (Verified):
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
  - Model: llama3 (or deepseek-r1)

## 2. Core Service: KnowledgeBaseService (The "Write" Path)
- **Goal**: Handle file upload and vectorization.
- **Input**: MultipartFile (PDF/TXT/MD).
- **Process**:
  1.  **Reader**: Use Spring AI's `TikaDocumentReader` to extract text.
  2.  **Splitter**: Use `TokenTextSplitter` to chunk text (default chunk size: 500-1000 tokens).
  3.  **Storage**: Store the chunks into Milvus using Spring AI's `VectorStore` interface.
- **Output**: Return success status with the generated `docId`.
- *Note*: Ensure exception handling for file parsing errors.

## 3. Core Service: ChatService (The "Read" Path)
- **Goal**: RAG-based Chat with Streaming support.
- **Input**: User query (String), Conversation ID.
- **Process**:
  1.  **Retrieve**: Search Milvus for top-k similar chunks using `VectorStore.similaritySearch()`.
  2.  **Prompt Engineering**: Construct a System Prompt injecting the retrieved context:
      > "You are a helpful assistant. Answer based on the context below: {context}"
  3.  **Generate**: Use `ChatClient` (Stream) to call Ollama.
- **Output**: Return `Flux<String>` or `Flux<ChatResponse>` for Server-Sent Events (SSE).

## 4. Coding Standards (Critical for Interview)
- **Don't use low-level HTTP clients**: MUST use Spring AI's high-level abstractions (`ChatClient`, `VectorStore`, `DocumentReader`).
- **Dependency Injection**: Use Constructor Injection (`@RequiredArgsConstructor`).
- **Logging**: Add Slf4j logs for key steps (e.g., "Retrieved 3 chunks for query...").
- **Error Handling**: Throw custom exceptions if the LLM service is down.

# Task:
Please generate the **Java Code** for the classes mentioned above.
Focus on `KnowledgeBaseService.java`, `ChatService.java`, and the `RAGController.java`.
Assume the `pom.xml` dependencies are already set (just mention key libs briefly if needed).