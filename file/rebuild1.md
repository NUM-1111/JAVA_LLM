# Role: Java Architect
# Task: Step 1 - Define Domain Layer & Infrastructure

# Context:
We are migrating a Go backend to **Java Spring Boot 3.3 + Spring Data JPA + MongoDB**.
The first step is to establish the **Data Layer** (Entities & Repositories) based on the provided Go structs.

# Input - Go Models (Reference):

## 1. Relational Data (PostgreSQL)
- **User**: ID, Username, Email, Password, CreatedAt.
- **KnowledgeBase**: BaseID (PK), UserID, BaseName, BaseDesc, BasePath, CreatedAt, UpdatedAt.
- **Document**: DocID (PK), BaseID, DocName, FileSuffix, FileType (Enum), FilePath, IsEnabled, Status (Enum), TotalChunks, CreatedAt, UpdatedAt.
- *Enums*:
    - `FileType`: Word, Excel, PPT, PDF, TXT, Image, Markdown, Other.
    - `ParseStatus`: None, Success, Failure.

## 2. Document Data (MongoDB)
- **Conversation**: ConversationID (PK), UserID, Title, CurrentNode, BaseID, DefaultModel, IsArchived, CreatedAt, UpdatedAt.
- **ChatMessage**: MessageID, ConversationID, Message (Object), Parent, Children (List), CreatedAt, UpdatedAt.

# Requirements:

## 1. Domain Layer (`com.heu.rag.core.domain`)
- **JPA Entities**:
    - Create `User.java`, `KnowledgeBase.java`, `Document.java`.
    - Use `@Entity`, `@Table(name = "users/knowledge_bases/documents")`.
    - **Crucial**: Map `int64` (Go) to `Long` (Java). Map `time.Time` (Go) to `LocalDateTime` (Java).
    - Use `@Id` with `@GeneratedValue(strategy = GenerationType.IDENTITY)` for auto-increment IDs (like User.ID).
    - For `BaseID` and `DocID` (Snowflake IDs in Go), use `@Id` but **without** `@GeneratedValue` (we will set them manually).
    - Use `@Enumerated(EnumType.STRING)` for `FileType` and `ParseStatus`.
    - Add `@PrePersist` and `@PreUpdate` to handle `createdAt` / `updatedAt` automatically.
- **Mongo Documents**:
    - Create `Conversation.java`, `ChatMessage.java`.
    - Use `@Document(collection = "conversations/chat_messages")`.
    - Use `@Id` for `conversationId` and `messageId` (String type).
- **Enums**:
    - Create `FileType.java` and `ParseStatus.java`.

## 2. Infrastructure Layer (`com.heu.rag.core.repository`)
- Create Repository Interfaces extending `JpaRepository<Entity, Long>` or `MongoRepository<Document, String>`.
    - `UserRepository`
    - `KnowledgeBaseRepository` (Find by userId)
    - `DocumentRepository` (Find by baseId)
    - `ConversationRepository` (Find by userId)
    - `ChatMessageRepository` (Find by conversationId)

## 3. Configuration (`com.heu.rag.config`)
- **Snowflake ID Generator**:
    - Create a utility class `SnowflakeIdGenerator` (or a Bean) to replace the Go snowflake library.
- **Global Exception Handler**:
    - Create `GlobalExceptionHandler` with `@RestControllerAdvice`.
    - Handle `ResourceNotFoundException`, `IllegalArgumentException`, and general `Exception`.
- **CORS Config**:
    - Allow origins: `http://localhost:5173`, `http://202.118.184.207`.
    - Allow methods: GET, POST, PUT, DELETE, OPTIONS.

# Output:
Generate the Java code for the `domain`, `repository`, and `config` packages.
Ensure usage of Lombok (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`).