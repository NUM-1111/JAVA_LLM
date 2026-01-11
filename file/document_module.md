# 文档管理模块开发文档 (Document Management Module)

> 本文档描述文档管理模块的完整实现需求，包括当前已完成功能和待实现功能。

---

## 1. 模块概述

文档管理模块负责文档的上传、查询、编辑、删除、启用/禁用、详情查看等功能。

**技术栈要求**:
- Java 17+
- Spring Boot 3.4.1+
- Spring Data JPA (PostgreSQL)
- Spring AI (TikaDocumentReader, TokenTextSplitter, VectorStore)
- Milvus (向量数据库)
- Snowflake ID 生成器

---

## 2. 当前实现状态

### 2.1 已实现功能 ✅

#### 2.1.1 文件上传 (POST /api/knowledge/upload/file)
- **文件位置**: 
  - Controller: `src/main/java/com/heu/rag/core/controller/KnowledgeBaseController.java`
  - Service: `src/main/java/com/heu/rag/core/service/KnowledgeBaseService.java`
- **实现状态**: ✅ 核心功能完成
- **当前功能**:
  - 文件上传接收（MultipartFile）
  - 文件解析（TikaDocumentReader）
  - 文本切分（TokenTextSplitter）
  - 向量化存储（Milvus）
  - 数据库记录（PostgreSQL）
- **当前问题**:
  1. **接口位置**: 放在 `KnowledgeBaseController` 中，建议移至 `DocumentController`
  2. **请求格式**: 使用 `@RequestParam`，符合前端期望（multipart/form-data）
  3. **userId 传递**: 通过参数传递，应从 JWT 获取
  4. **响应格式**: 需要转换为前端期望的格式

#### 2.1.2 获取文档列表 (GET /api/knowledge/document/list)
- **文件位置**: `src/main/java/com/heu/rag/core/controller/KnowledgeBaseController.java`
- **实现状态**: ✅ 基础实现完成
- **当前问题**:
  1. **接口位置**: 应移至 `DocumentController`
  2. **请求格式不匹配**:
     - 当前: `@RequestParam Long baseId`
     - 前端期望: `?baseId={baseId}&search={search}&limit={limit}&offset={offset}`
  3. **响应格式不匹配**:
     - 当前: `List<Document>`
     - 前端期望: `{"total": number, "data": [...]}` 且字段名为 snake_case
  4. **缺少搜索功能**: 需要支持 `search` 参数（文档名模糊查询）
  5. **缺少分页**: 需要支持 `limit` 和 `offset` 参数

---

## 3. 待实现功能 ⚠️

### 3.1 文档查询功能

#### 3.1.1 获取文档列表（优化版）(GET /api/knowledge/document/list)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.4.1
- **查询参数**:
  ```
  baseId: Long (必需)
  search: String (可选, 文档名模糊查询)
  limit: Integer (可选, 默认 10)
  offset: Integer (可选, 默认 0)
  ```
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "total": number,
      "data": [
        {
          "docId": "string",
          "doc_name": "string",
          "file_type": "string",
          "created_at": "ISO 8601",
          "is_enabled": boolean,
          "status": "string",
          "total_chunks": number
        }
      ]
    }
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 验证知识库属于当前用户
  3. 根据 `baseId` 查询文档
  4. 如果提供 `search` 参数，进行文档名模糊查询（使用 `LIKE` 或 `ILIKE`）
  5. 使用 `limit` 和 `offset` 进行分页
  6. 返回文档列表和总数（使用 snake_case 字段名）
- **实现位置**: 创建 `DocumentController.java`

#### 3.1.2 获取文档信息 (GET /api/knowledge/document/:docId)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.4.6
- **路径参数**: `docId` (Long)
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": "文档名称"
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询文档
  3. 验证文档所属知识库属于当前用户
  4. 返回文档名称
- **实现位置**: `DocumentController.java`

#### 3.1.3 获取文档切片详情 (GET /api/knowledge/document/detail)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.4.7 (文档详情页查看切片内容)
- **查询参数**:
  ```
  docId: Long (必需)
  search: String (可选, 内容模糊查询)
  limit: Integer (可选, 默认 10)
  offset: Integer (可选, 默认 0)
  ```
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "total": number,
      "data": [
        {
          "chunk_id": "string",
          "content": "string"
        }
      ]
    }
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询文档
  3. 验证文档所属知识库属于当前用户
  4. 从 Milvus 查询该文档的所有向量数据（通过 metadata 过滤: `docId={docId}`）
  5. 如果提供 `search` 参数，进行内容模糊查询（在内存中过滤或使用 Milvus 的文本搜索）
  6. 使用 `limit` 和 `offset` 进行分页
  7. 返回切片列表
- **技术难点**: 
  - Milvus 查询需要根据 metadata 过滤
  - 内容搜索可能需要使用 Milvus 的 `expr` 或文本搜索功能
  - 或者查询所有切片后在内存中过滤
- **实现位置**: `DocumentController.java` + `DocumentService.java`

### 3.2 文档编辑功能

#### 3.2.1 修改文档启用状态 (POST /api/knowledge/document/change/status)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.4.3
- **请求体**:
  ```json
  {
    "docId": "string",
    "is_enabled": boolean
  }
  ```
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**: 成功消息
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询文档
  3. 验证文档所属知识库属于当前用户
  4. 更新 `isEnabled` 字段
  5. 更新 `updatedAt` 时间
  6. 保存并返回
- **实现位置**: `DocumentController.java`

**注意**: 
- `is_enabled` 用于控制文档是否参与向量检索
- 禁用时，RAG 检索应过滤该文档的向量数据（通过 metadata 过滤）

#### 3.2.2 重命名文档 (POST /api/knowledge/document/rename)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.4.4
- **请求体**:
  ```json
  {
    "docId": "string",
    "doc_name": "string"
  }
  ```
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**: 成功消息
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询文档
  3. 验证文档所属知识库属于当前用户
  4. 更新 `docName` 字段
  5. 更新 `updatedAt` 时间
  6. 保存并返回
- **实现位置**: `DocumentController.java`

### 3.3 文档删除功能

#### 3.3.1 删除文档 (POST /api/knowledge/delete/document)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.4.5
- **请求体**:
  ```json
  {
    "baseId": "string",
    "docId": "string"
  }
  ```
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**: 成功消息
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 验证知识库属于当前用户
  3. 查询文档
  4. 从 Milvus 删除该文档的所有向量数据（通过 metadata 过滤: `docId={docId}`）
  5. 删除 PostgreSQL 中的文档记录
  6. 可选：删除文件系统中的文件（如果有）
- **实现位置**: `DocumentController.java` + `DocumentService.java`
- **技术难点**: 
  - Milvus 删除需要根据 metadata 过滤
  - 使用 `vectorStore.delete()` 并指定删除条件

---

## 4. 技术优化建议

### 4.1 模块拆分 ⭐

**当前问题**: 文档相关接口放在 `KnowledgeBaseController` 中

**实施方案**:
1. **创建 `DocumentController.java`**:
   ```java
   @RestController
   @RequestMapping("/api/knowledge/document")
   @RequiredArgsConstructor
   @Slf4j
   public class DocumentController {
       private final DocumentService documentService;
       // ...
   }
   ```

2. **创建 `DocumentService.java`**:
   - 将 `KnowledgeBaseService.uploadAndProcess()` 中的文档处理逻辑移至 `DocumentService`
   - 新增文档查询、编辑、删除等方法

3. **接口路径调整**:
   - 保持路径不变: `/api/knowledge/upload/file` 和 `/api/knowledge/document/**`
   - 将控制器方法移至 `DocumentController`

### 4.2 用户认证集成 ⭐

**当前问题**: userId 通过请求参数传递

**实施方案**:
- 从 JWT token 获取用户ID（使用 `@RequestAttribute("userId")` 或 `@AuthenticationPrincipal`）
- 验证文档所属知识库属于当前用户

### 4.3 响应格式统一 ⭐

**当前问题**: 字段名使用 camelCase，前端期望 snake_case

**实施方案**:
1. **创建 DTO 类** (`DocumentDTO.java`):
   ```java
   @Data
   @Builder
   public class DocumentDTO {
       private Long docId;
       @JsonProperty("doc_name")
       private String docName;
       @JsonProperty("file_type")
       private String fileType;
       @JsonProperty("created_at")
       private String createdAt;
       @JsonProperty("is_enabled")
       private Boolean isEnabled;
       @JsonProperty("total_chunks")
       private Integer totalChunks;
       private String status;
       
       public static DocumentDTO from(Document doc) {
           // 转换逻辑
       }
   }
   ```

2. **Controller 中使用 DTO**:
   ```java
   @GetMapping("/list")
   public Result<Map<String, Object>> listDocuments(
           @RequestParam Long baseId,
           @RequestParam(required = false) String search,
           @RequestParam(defaultValue = "10") int limit,
           @RequestParam(defaultValue = "0") int offset,
           @RequestAttribute("userId") Long userId) {
       
       List<Document> documents = documentService.listDocuments(baseId, search, limit, offset, userId);
       List<DocumentDTO> dtos = documents.stream()
           .map(DocumentDTO::from)
           .collect(Collectors.toList());
       
       Map<String, Object> response = new HashMap<>();
       response.put("total", documentService.countDocuments(baseId, search, userId));
       response.put("data", dtos);
       return Result.success(response);
   }
   ```

### 4.4 分页和搜索实现

**实施方案**:

1. **Repository 层**:
   ```java
   public interface DocumentRepository extends JpaRepository<Document, Long> {
       // 基础查询
       List<Document> findByBaseId(Long baseId);
       
       // 分页查询
       Page<Document> findByBaseId(Long baseId, Pageable pageable);
       
       // 搜索 + 分页
       @Query("SELECT d FROM Document d WHERE d.baseId = :baseId AND d.docName LIKE %:search%")
       Page<Document> findByBaseIdAndDocNameContaining(
           @Param("baseId") Long baseId,
           @Param("search") String search,
           Pageable pageable
       );
       
       // 计数
       long countByBaseId(Long baseId);
       long countByBaseIdAndDocNameContaining(Long baseId, String search);
   }
   ```

2. **Service 层**:
   ```java
   public Page<Document> listDocuments(Long baseId, String search, int limit, int offset, Long userId) {
       // 验证权限
       verifyOwnership(baseId, userId);
       
       Pageable pageable = PageRequest.of(offset / limit, limit, Sort.by("createdAt").descending());
       
       if (search != null && !search.trim().isEmpty()) {
           return documentRepository.findByBaseIdAndDocNameContaining(baseId, search, pageable);
       } else {
           return documentRepository.findByBaseId(baseId, pageable);
       }
   }
   ```

### 4.5 Milvus 切片查询

**当前问题**: 需要从 Milvus 查询文档的所有切片

**实施方案**:
1. **Spring AI VectorStore API**:
   ```java
   // 查询指定文档的所有向量
   SearchRequest searchRequest = SearchRequest.builder()
       .query("") // 空查询
       .filterExpression("docId == \"" + docId + "\"") // metadata 过滤
       .topK(10000) // 足够大的数量
       .build();
   List<Document> chunks = vectorStore.similaritySearch(searchRequest);
   ```

2. **内容搜索**:
   - 如果 Milvus 支持文本搜索，使用搜索表达式
   - 否则，查询所有切片后在内存中过滤

### 4.6 Milvus 切片删除

**当前问题**: 需要删除文档的所有向量数据

**实施方案**:
```java
// Spring AI VectorStore 可能没有直接删除接口
// 需要直接使用 Milvus Client
milvusClient.delete(DeleteParam.newBuilder()
    .withCollectionName("vector_collection")
    .withExpr("docId == \"" + docId + "\"")
    .build());
```

或者：
```java
// 使用 Spring AI 的 delete 方法（如果支持）
vectorStore.delete(List.of(docId.toString())); // 可能需要实现自定义删除逻辑
```

---

## 5. 数据库设计

### 5.1 Document 实体 (已存在)
- **表名**: `documents`
- **存储**: PostgreSQL
- **字段**:
  - `doc_id` (Long, Primary Key, Snowflake ID)
  - `base_id` (Long, Foreign Key, Not Null)
  - `doc_name` (String, Not Null)
  - `file_suffix` (String)
  - `file_type` (FileType enum, Not Null)
  - `file_path` (String, Nullable)
  - `is_enabled` (Boolean, Default true)
  - `status` (ParseStatus enum, Default None)
  - `total_chunks` (Integer, Default 0)
  - `created_at` (LocalDateTime, Not Null)
  - `updated_at` (LocalDateTime)

**索引建议**:
- `base_id` 索引（用于查询知识库的文档列表）
- `doc_name` 索引（用于搜索）

---

## 6. API 接口规范总结

| 接口 | 方法 | 路径 | 认证 | 状态 |
|------|------|------|------|------|
| 上传文件 | POST | `/api/knowledge/upload/file` | ✅ | ✅ 需优化 |
| 获取文档列表 | GET | `/api/knowledge/document/list` | ✅ | ✅ 需优化 |
| 获取文档信息 | GET | `/api/knowledge/document/:docId` | ✅ | ⚠️ 待实现 |
| 获取文档切片详情 | GET | `/api/knowledge/document/detail` | ✅ | ⚠️ 待实现 |
| 修改文档启用状态 | POST | `/api/knowledge/document/change/status` | ✅ | ⚠️ 待实现 |
| 重命名文档 | POST | `/api/knowledge/document/rename` | ✅ | ⚠️ 待实现 |
| 删除文档 | POST | `/api/knowledge/delete/document` | ✅ | ⚠️ 待实现 |

---

## 7. 前后端对接注意事项

1. **字段名格式**:
   - 前端使用 snake_case: `doc_name`, `file_type`, `is_enabled`, `created_at`
   - 后端数据库使用 camelCase: `docName`, `fileType`, `isEnabled`, `createdAt`
   - 需要在 DTO 层进行转换

2. **分页参数**:
   - 前端使用 `limit` 和 `offset`，不是 `page` 和 `size`
   - 默认值: `limit=10`, `offset=0`

3. **响应格式**:
   - 列表接口返回: `{"total": number, "data": [...]}`
   - 单个对象返回: `{"code": 200, "msg": "success", "data": {...}}`

4. **文件上传**:
   - 使用 `multipart/form-data`
   - 字段名: `file`
   - 查询参数: `baseId`
   - 支持多文件上传，前端循环调用接口

5. **权限验证**:
   - 所有操作都需要验证文档所属知识库属于当前用户
   - 返回 403 Forbidden 或 404 Not Found

---

## 8. 开发优先级

1. **P0 (必须)**:
   - 模块拆分（创建 DocumentController 和 DocumentService）
   - JWT 认证集成（userId 从 token 获取）
   - 响应格式优化（DTO 转换，snake_case）
   - 获取文档列表优化（分页、搜索）

2. **P1 (重要)**:
   - 获取文档信息
   - 修改文档启用状态
   - 重命名文档
   - 删除文档（包含 Milvus 数据清理）

3. **P2 (可选)**:
   - 获取文档切片详情（Milvus 查询实现）
   - 文档统计信息（总大小、平均切片数等）
   - 批量操作（批量启用/禁用、批量删除）

---

**文档版本**: 1.0  
**最后更新**: 2024  
**维护者**: Java 后端开发团队

