# Role: Java Architect
# Task: Step 2 - Implement Core Business Services (RAG Logic)

# Context:
We have established the Domain Layer (Step 1).
Now we need to implement the **Core Services** using **Spring AI** to replace the legacy Python/Go logic.

# Critical Import Note ⚠️:
- We have a local entity: `com.heu.rag.core.domain.Document` (Metadata stored in Postgres).
- Spring AI has a class: `org.springframework.ai.document.Document` (Vector data stored in Milvus).
- **Instruction**: When using them in the same file, use the full package name for the Spring AI one to avoid confusion.

# Requirements:

## 1. Service: `KnowledgeBaseService` (The "Write" Path)
- **Dependencies**: `DocumentRepository`, `VectorStore`, `TikaDocumentReader` (create locally), `TokenTextSplitter`.
- **Method**: `public void uploadAndProcess(MultipartFile file, Long baseId, Long userId)`
- **Logic Flow**:
  1.  **Validation**: Check if `KnowledgeBase` exists.
  2.  **DB Entry**: Save a new `com.heu.rag.core.domain.Document` entity with status `NONE`.
  3.  **Parsing**:
      - Use `new TikaDocumentReader(new InputStreamResource(file.getInputStream()))` to read text.
      - Extract content.
  4.  **Splitting**:
      - Use `new TokenTextSplitter()` (default params) to split text into chunks.
  5.  **Vectorization & Storage**:
      - Convert chunks into `List<org.springframework.ai.document.Document>`.
      - **Crucial**: Inject metadata into each chunk (key: "docId", value: dbDocument.getId().toString()).
      - Call `vectorStore.add(chunks)` (This automatically calls Ollama Embedding).
  6.  **Completion**: Update DB entity status to `SUCCESS`.
  7.  **Error Handling**: If fails, update status to `FAILURE` and throw exception.

## 2. Service: `ChatService` (The "Read" Path)
- **Dependencies**: `ChatClient.Builder`, `VectorStore`, `ChatMessageRepository`, `ConversationRepository`.
- **Configuration**: Inject `OllamaChatModel` into the builder.
- **Method**: `public Flux<String> chatStream(String query, String conversationId)`
- **Logic Flow**:
  1.  **Context Retrieval**:
      - Call `vectorStore.similaritySearch(SearchRequest.query(query).withTopK(4))`.
      - Concatenate results into a String `context`.
  2.  **Prompt Construction**:
      - System Text: "You are a helpful assistant. Use the following context to answer: {context}"
      - User Text: `{query}`
  3.  **History Integration (Bonus)**:
      - Fetch last 5 messages from `ChatMessageRepository` (if conversationId exists) to maintain context.
  4.  **Generation**:
      - Use `chatClientBuilder.build().prompt().system(s -> s.param("context", context)).user(query).stream().content()`.
  5.  **Persistence**:
      - Async save the User query and the final AI response to MongoDB (`ChatMessage` collection).

## 3. Configuration Update
- Ensure `VectorStore` (Milvus) and `ChatModel` (Ollama) are correctly configured in `RagConfiguration`.

# Output:
Generate Java code for:
1.  `com.heu.rag.core.service.KnowledgeBaseService`
2.  `com.heu.rag.core.service.ChatService`
3.  Any necessary DTOs (e.g., `ChatRequest`, `UploadResponse`).