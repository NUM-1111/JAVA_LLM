# 项目 API 文档

## 1. 基本信息

- **服务名/模块名**：java-rag-backend
- **Base URL**：http://localhost:8080
- **Content-Type**：application/json（文件上传接口使用 multipart/form-data，流式接口使用 text/event-stream）
- **认证方式**：待确认（当前返回 UUID token，未发现 JWT/Session 机制）

## 2. 接口总览

| Method | Path | 简述 | Auth |
|--------|------|------|------|
| POST | /api/login | 用户登录 | 待确认 |
| POST | /api/register | 用户注册 | 待确认 |
| POST | /api/knowledge/create | 创建知识库 | 待确认 |
| POST | /api/knowledge/upload/file | 上传文件到知识库 | 待确认 |
| GET | /api/knowledge/list | 获取知识库列表 | 待确认 |
| DELETE | /api/knowledge/delete/{id} | 删除知识库 | 待确认 |
| GET | /api/knowledge/document/list | 获取知识库文档列表 | 待确认 |
| POST | /api/new/message | 发送聊天消息（流式响应） | 待确认 |

## 3. 接口详情

### AuthController

#### POST /api/login

- **用途**：用户登录
- **认证**：待确认
- **请求头**：Content-Type: application/json
- **路径参数**：无
- **查询参数**：无
- **请求体**：
  - 示例 JSON：
    ```json
    {
      "username": "user123",
      "password": "password123"
    }
    ```
  - 字段说明表：
    | 字段名 | 类型 | 是否可空 | 说明 |
    |--------|------|----------|------|
    | username | String | 否 | 用户名 |
    | password | String | 否 | 密码 |
- **响应**：
  - 状态码：200（成功）、500（失败，通用推测(待确认)）
  - 示例 JSON：
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": "550e8400-e29b-41d4-a716-446655440000"
    }
    ```
    或错误响应：
    ```json
    {
      "code": 500,
      "msg": "Invalid username or password",
      "data": null
    }
    ```
  - 字段说明表：
    | 字段名 | 类型 | 说明 |
    |--------|------|------|
    | code | Integer | 状态码，200=成功，500=错误 |
    | msg | String | 消息 |
    | data | String | 成功时返回 token（UUID），失败时为 null |
- **备注**：
  -1.为什么要有uuid->安全性,不易攻击,可替代敏感信息去userid,起到身份识别的作用

#### POST /api/register

- **用途**：用户注册
- **认证**：待确认
- **请求头**：Content-Type: application/json
- **路径参数**：无
- **查询参数**：无
- **请求体**：
  - 示例 JSON：
    ```json
    {
      "username": "newuser",
      "email": "user@example.com",
      "password": "password123"
    }
    ```
  - 字段说明表：
    | 字段名 | 类型 | 是否可空 | 说明 |
    |--------|------|----------|------|
    | username | String | 否 | 用户名（唯一） |
    | email | String | 否 | 邮箱（唯一） |
    | password | String | 否 | 密码（明文，待确认是否加密） |
- **响应**：
  - 状态码：200（成功）、500（失败，通用推测(待确认)）
  - 示例 JSON：
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": "Registration successful"
    }
    ```
    或错误响应：
    ```json
    {
      "code": 500,
      "msg": "Username already exists",
      "data": null
    }
    ```
    或：
    ```json
    {
      "code": 500,
      "msg": "Email already exists",
      "data": null
    }
    ```
  - 字段说明表：
    | 字段名 | 类型 | 说明 |
    |--------|------|------|
    | code | Integer | 状态码，200=成功，500=错误 |
    | msg | String | 消息 |
    | data | String | 成功时返回提示信息，失败时为 null |
- **备注**：无

### KnowledgeBaseController

#### POST /api/knowledge/create

- **用途**：创建知识库
- **认证**：待确认
- **请求头**：Content-Type: application/json
- **路径参数**：无
- **查询参数**：
  | 参数名 | 类型 | 是否必填 | 默认值 | 说明 |
  |--------|------|----------|--------|------|
  | userId | Long | 是 | 无 | 用户ID |
- **请求体**：
  - 示例 JSON：
    ```json
    {
      "baseName": "我的知识库",
      "baseDesc": "知识库描述"
    }
    ```
  - 字段说明表：
    | 字段名 | 类型 | 是否可空 | 说明 |
    |--------|------|----------|------|
    | baseName | String | 否 | 知识库名称 |
    | baseDesc | String | 是 | 知识库描述 |
- **响应**：
  - 状态码：200（成功）、500（失败，通用推测(待确认)）
  - 示例 JSON：
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": {
        "baseId": 1234567890123456789,
        "userId": 1,
        "baseName": "我的知识库",
        "baseDesc": "知识库描述",
        "basePath": null,
        "createdAt": "2024-01-01T10:00:00",
        "updatedAt": "2024-01-01T10:00:00"
      }
    }
    ```
  - 字段说明表（data 字段）：
    | 字段名 | 类型 | 说明 |
    |--------|------|------|
    | baseId | Long | 知识库ID（Snowflake ID） |
    | userId | Long | 用户ID |
    | baseName | String | 知识库名称 |
    | baseDesc | String | 知识库描述 |
    | basePath | String | 知识库路径（可为空） |
    | createdAt | String | 创建时间（LocalDateTime，ISO格式） |
    | updatedAt | String | 更新时间（LocalDateTime，ISO格式） |
- **备注**：baseId 由系统自动生成（Snowflake ID）

#### POST /api/knowledge/upload/file

- **用途**：上传文件到知识库并处理
- **认证**：待确认
- **请求头**：Content-Type: multipart/form-data
- **路径参数**：无
- **查询参数**：
  | 参数名 | 类型 | 是否必填 | 默认值 | 说明 |
  |--------|------|----------|--------|------|
  | file | MultipartFile | 是 | 无 | 上传的文件 |
  | baseId | Long | 是 | 无 | 知识库ID |
  | userId | Long | 是 | 无 | 用户ID |
- **请求体**：multipart/form-data 表单数据
- **响应**：
  - 状态码：200（成功）、500（失败，通用推测(待确认)）
  - 示例 JSON：
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": {
        "message": "File uploaded and processed successfully",
        "fileName": "document.pdf",
        "baseId": 1234567890123456789
      }
    }
    ```
    或错误响应：
    ```json
    {
      "code": 500,
      "msg": "File upload failed: <错误信息>",
      "data": null
    }
    ```
  - 字段说明表（data 字段）：
    | 字段名 | 类型 | 说明 |
    |--------|------|------|
    | message | String | 提示信息 |
    | fileName | String | 文件名 |
    | baseId | Long | 知识库ID |
- **备注**：文件上传后会自动处理（解析、向量化等）

#### GET /api/knowledge/list

- **用途**：获取当前用户的知识库列表
- **认证**：待确认
- **请求头**：无特殊要求
- **路径参数**：无
- **查询参数**：
  | 参数名 | 类型 | 是否必填 | 默认值 | 说明 |
  |--------|------|----------|--------|------|
  | userId | Long | 是 | 无 | 用户ID |
- **请求体**：无
- **响应**：
  - 状态码：200（成功）、400/404/500（通用推测(待确认)）
  - 示例 JSON：
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": [
        {
          "baseId": 1234567890123456789,
          "userId": 1,
          "baseName": "我的知识库",
          "baseDesc": "知识库描述",
          "basePath": null,
          "createdAt": "2024-01-01T10:00:00",
          "updatedAt": "2024-01-01T10:00:00"
        }
      ]
    }
    ```
  - 字段说明表（data 字段为数组，元素结构同 POST /api/knowledge/create 的响应）：
    | 字段名 | 类型 | 说明 |
    |--------|------|------|
    | baseId | Long | 知识库ID |
    | userId | Long | 用户ID |
    | baseName | String | 知识库名称 |
    | baseDesc | String | 知识库描述 |
    | basePath | String | 知识库路径（可为空） |
    | createdAt | String | 创建时间 |
    | updatedAt | String | 更新时间 |
- **备注**：返回指定用户的所有知识库

#### DELETE /api/knowledge/delete/{id}

- **用途**：删除知识库
- **认证**：待确认
- **请求头**：无特殊要求
- **路径参数**：
  | 参数名 | 类型 | 是否必填 | 说明 |
  |--------|------|----------|------|
  | id | Long | 是 | 知识库ID |
- **查询参数**：无
- **请求体**：无
- **响应**：
  - 状态码：200（成功）、404（资源不存在，通用推测(待确认)）、500（通用推测(待确认)）
  - 示例 JSON：
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": "Knowledge base deleted successfully"
    }
    ```
  - 字段说明表：
    | 字段名 | 类型 | 说明 |
    |--------|------|------|
    | code | Integer | 状态码 |
    | msg | String | 消息 |
    | data | String | 成功提示信息 |
- **备注**：删除不存在的知识库会返回 404 错误

#### GET /api/knowledge/document/list

- **用途**：获取指定知识库的文档列表
- **认证**：待确认
- **请求头**：无特殊要求
- **路径参数**：无
- **查询参数**：
  | 参数名 | 类型 | 是否必填 | 默认值 | 说明 |
  |--------|------|----------|--------|------|
  | baseId | Long | 是 | 无 | 知识库ID |
- **请求体**：无
- **响应**：
  - 状态码：200（成功）、400/404/500（通用推测(待确认)）
  - 示例 JSON：
    ```json
    {
      "code": 200,
      "msg": "success",
      "data": [
        {
          "docId": 9876543210987654321,
          "baseId": 1234567890123456789,
          "docName": "document.pdf",
          "fileSuffix": "pdf",
          "fileType": "PDF",
          "filePath": "/path/to/file",
          "isEnabled": true,
          "status": "Parsed",
          "totalChunks": 100,
          "createdAt": "2024-01-01T10:00:00",
          "updatedAt": "2024-01-01T10:00:00"
        }
      ]
    }
    ```
  - 字段说明表（data 字段为数组）：
    | 字段名 | 类型 | 说明 |
    |--------|------|------|
    | docId | Long | 文档ID（Snowflake ID） |
    | baseId | Long | 知识库ID |
    | docName | String | 文档名称 |
    | fileSuffix | String | 文件后缀 |
    | fileType | String | 文件类型（枚举：PDF等） |
    | filePath | String | 文件路径 |
    | isEnabled | Boolean | 是否启用 |
    | status | String | 解析状态（枚举：None/Parsing/Parsed/Failed等） |
    | totalChunks | Integer | 总块数 |
    | createdAt | String | 创建时间 |
    | updatedAt | String | 更新时间 |
- **备注**：返回指定知识库下的所有文档

### ChatController

#### POST /api/new/message

- **用途**：发送聊天消息，获取流式响应（RAG 问答）
- **认证**：待确认
- **请求头**：Content-Type: application/json
- **路径参数**：无
- **查询参数**：无
- **请求体**：
  - 示例 JSON：
    ```json
    {
      "message": "什么是人工智能？",
      "conversation_id": "conv-123",
      "baseId": 1234567890123456789
    }
    ```
  - 字段说明表：
    | 字段名 | 类型 | 是否可空 | 说明 |
    |--------|------|----------|------|
    | message | String | 否 | 用户消息内容 |
    | conversation_id | String | 是 | 会话ID |
    | baseId | Long | 是 | 知识库ID |
- **响应**：
  - 状态码：200（成功）、400/500（通用推测(待确认)）
  - 响应类型：Server-Sent Events (SSE)，Content-Type: text/event-stream
  - 示例响应流：
    ```
    data: 这是
    data: 关于
    data: 人工智能
    data: 的回答...
    ```
    或错误响应：
    ```
    data: Error: Query cannot be empty
    ```
    或：
    ```
    data: Error: <错误信息>
    ```
  - 字段说明表：响应为 SSE 流，每个 data 事件包含一段文本片段
- **备注**：流式响应，前端需使用 EventSource 或类似机制接收；空消息会返回错误

## 4. 通用约定

- **统一响应结构**：所有非流式接口使用 `Result<T>` 包装：
  ```json
  {
    "code": Integer,  // 200=成功，500=错误（可自定义错误码）
    "msg": String,    // 消息
    "data": T         // 数据（泛型，可为 null）
  }
  ```
- **分页参数**：待确认（当前接口未发现分页）
- **时间格式**：LocalDateTime，通常为 ISO-8601 格式（如 "2024-01-01T10:00:00"）
- **错误响应格式**：使用 `Result<T>`，code=500 或自定义错误码，msg 包含错误信息，data=null

## 5. 本地启动与依赖（精简版）

- **必需依赖**：
  - PostgreSQL（端口 5433，数据库 rag_db，用户 rag_user）
  - MongoDB（端口 27017，数据库 rag_chat_history）
  - Milvus（端口 19530，向量数据库）
  - Ollama（端口 11434，LLM 服务，模型 qwen2.5:7b）
  - Redis（端口 6379，密码 redis_password，待确认是否使用）
  - etcd（Milvus 元数据，端口 2379）
  - MinIO（Milvus 存储，端口 9000/9001）
- **环境变量/配置文件入口**：`src/main/resources/application.yml`
- **常用命令**：
  ```bash
  # 启动依赖服务
  docker-compose up -d
  
  # Maven 编译
  mvn clean compile
  
  # Maven 运行
  mvn spring-boot:run
  
  # Maven 打包
  mvn clean package
  ```

## 6. 故障排查

- **数据库连接 refused**：检查 PostgreSQL 是否在 127.0.0.1:5433 运行，确认 docker-compose 服务已启动，检查健康检查状态
- **MongoDB 连接失败**：确认 MongoDB 在 localhost:27017 运行
- **Milvus 连接失败**：确认 Milvus 及其依赖（etcd、MinIO）已启动，检查端口 19530 是否可访问
- **Ollama 连接失败**：确认 Ollama 服务在 localhost:11434 运行，确认模型 qwen2.5:7b 已下载
- **文件上传失败**：检查文件大小限制、文件类型限制（待确认具体限制），检查知识库 baseId 是否存在

