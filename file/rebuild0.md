# Role: Java Architect
# Task: Step 0 - Project Initialization & Configuration

# Context:
We are starting a new Spring Boot 3.3.x project with Java 21.
We need to set up the `pom.xml` and `application.yml` before writing any Java code.

# Requirements:

## 1. Dependencies (pom.xml)
Generate a `pom.xml` with the following starters:
- **Core**: `spring-boot-starter-web`, `lombok` (annotation processor).
- **Data**: `spring-boot-starter-data-jpa`, `spring-boot-starter-data-mongodb`.
- **Database Drivers**: `postgresql`, `h2` (optional).
- **AI & RAG**:
  - `spring-ai-bom` (version 1.0.0-M1 or snapshot).
  - `spring-ai-ollama-spring-boot-starter`.
  - `spring-ai-milvus-store-spring-boot-starter`.
  - `spring-ai-tika-document-reader` (for parsing PDFs).
- **Utils**: `hutool-all` (optional, for Snowflake ID if needed, or we implement manually).

## 2. Configuration (application.yml)
Generate `src/main/resources/application.yml` with these EXACT settings (to match our Docker setup):

```yaml
server:
  port: 8080

spring:
  application:
    name: java-rag-backend
  # PostgreSQL
  datasource:
    url: jdbc:postgresql://localhost:5432/rag_db
    username: rag_user
    password: rag_password
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

  # MongoDB
  data:
    mongodb:
      uri: mongodb://localhost:27017/rag_chat_history

  # Spring AI
  ai:
    ollama:
      base-url: http://localhost:11434
      chat:
        model: llama3 # Or deepseek-r1
    vectorstore:
      milvus:
        client:
          host: localhost
          port: 19530
        embedding-dimension: 4096 # Adjust based on your Ollama model (e.g., Llama3 is 4096)