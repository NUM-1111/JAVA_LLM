# Role: Java Architect
# Task: Step 3 - Implement REST Controllers (API Layer)

# Context:
We have completed the Domain Layer (Step 1) and Core Services (Step 2).
Now we need to expose the **REST APIs** to match the legacy Go backend routes.
The Frontend is React and expects specific URL paths and JSON formats.

# Reference Routes (from legacy Go):
- Auth: `POST /api/login`, `POST /api/register`
- Chat: `POST /api/new/message` (Stream response)
- Knowledge: `POST /api/knowledge/create`, `POST /api/knowledge/upload/file`, `GET /api/knowledge/list`, `DELETE /api/knowledge/delete/{id}`

# Requirements:

## 1. Unified Response Wrapper (`common` package)
- Create a generic class `Result<T>` (or `ApiResponse`) to mimic the Go JSON response:
  - Fields: `int code` (200 for success), `String msg`, `T data`.
  - Static methods: `success(T data)`, `error(String msg)`.
- **Crucial**: The frontend expects `msg` field, not `message`.

## 2. Controller: `AuthController`
- **Path**: `/api`
- **Endpoints**:
  - `POST /login`: Accepts `LoginRequest` (username/password). Returns `Result<String>` (Token or SessionID).
    - *Simulate logic*: Check DB, if valid, return a dummy JWT/UUID for now.
  - `POST /register`: Accepts `RegisterRequest`. Creates User.

## 3. Controller: `KnowledgeBaseController`
- **Path**: `/api/knowledge`
- **Dependencies**: `KnowledgeBaseService` (from Step 2).
- **Endpoints**:
  - `POST /create`: Create a new KB.
  - `POST /upload/file`: Accepts `MultipartFile file`, `Long baseId`.
    - Call `service.uploadAndProcess(...)`.
  - `GET /list`: Return list of KBs for current user.
  - `DELETE /delete/{id}`: Delete KB.
  - `GET /document/list`: Get documents for a specific baseId.

## 4. Controller: `ChatController`
- **Path**: `/api`
- **Dependencies**: `ChatService` (from Step 2).
- **Endpoints**:
  - `POST /new/message`:
    - **Input**: `ChatRequest` DTO (match Go structure: `message`, `conversation_id`, `baseId`).
    - **Output**: `Flux<String>` or `SseEmitter`.
    - **MediaType**: `TEXT_EVENT_STREAM_VALUE` (Essential for React to consume stream).
    - Call `chatService.chatStream(query, conversationId)`.

## 5. DTOs
- Create necessary DTOs in `com.heu.rag.core.controller.dto` package if they don't exist:
  - `LoginRequest`, `RegisterRequest`, `ChatRequest`, `BaseCreateRequest`.

# Coding Standards:
- Use `@RestController`, `@RequestMapping`, `@CrossOrigin`.
- Inject services via `@RequiredArgsConstructor`.
- Use the `Result<T>` wrapper for all non-stream responses.
- Add Swagger annotations (`@Tag`, `@Operation`) if possible (optional).

# Output:
Generate Java code for:
1.  `com.heu.rag.common.Result`
2.  `com.heu.rag.core.controller.AuthController`
3.  `com.heu.rag.core.controller.KnowledgeBaseController`
4.  `com.heu.rag.core.controller.ChatController`
5.  Relevant DTOs.