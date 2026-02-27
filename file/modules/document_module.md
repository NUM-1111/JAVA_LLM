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
  1. **接口位置**: 仍在 `KnowledgeBaseController`（用于兼容），可评估是否迁移/保留
  2. **userId 获取**: ✅ 已从 JWT 获取（不再通过参数传递）
  3. **异常与状态**: ✅ 有 ParseStatus 与 totalChunks 写回（失败标记 Failure）
  4. **向量元数据**: ✅ 注入 `docId/baseId/fileName/chunkIndex`，并解决 Milvus `metadata_json` 必填问题

#### 2.1.2 文档列表（分页 + 搜索）(GET /api/knowledge/document/list)
- **文件位置**: `src/main/java/com/heu/rag/core/controller/DocumentController.java`
- **实现状态**: ✅ 已实现
- **能力**:
  - `baseId + search + limit + offset`
  - 返回 `{"total": n, "data": [...]}`（DTO 输出 snake_case）

#### 2.1.3 获取文档信息 (GET /api/knowledge/document/{docId})
- **实现状态**: ✅ 已实现（返回 docName）

#### 2.1.4 获取文档切片详情 (GET /api/knowledge/document/detail)
- **实现状态**: ✅ 已实现（limit/offset/search）
- **性能优化**: ✅ 已优化为使用 Milvus Query API + 分页查询，避免全量扫描（详见 `file/milvus/MILVUS_IMPLEMENTATION_STATUS.md`）

#### 2.1.5 修改文档启用状态 (POST /api/knowledge/document/change/status)
- **实现状态**: ✅ 已实现（更新 PostgreSQL 字段 `isEnabled`）
- **RAG 检索过滤**: ✅ 已实现，RAG 检索时自动过滤禁用文档（`isEnabled == 'true'`，见 `MilvusService.similaritySearchWithBaseId()`）

#### 2.1.6 重命名文档 (POST /api/knowledge/document/rename)
- **实现状态**: ✅ 已实现

---

## 3. 待实现功能 ⚠️

### 3.1 缺口与优化（按代码现状）

#### 3.1.1 删除文档时的 Milvus 向量清理 ✅ 已实现
- **状态**：✅ 已实现 `MilvusService.deleteChunksByDocId()`，删除文档时自动清理向量
- **实现位置**：`DocumentService.deleteDocument()` 调用 `milvusService.deleteChunksByDocId()`
- **验收**：✅ 删除后 `docId` 对应向量不可被检索/查询到

#### 3.1.2 切片查询性能优化 ✅ 已实现
- **状态**：✅ 已优化为使用 Milvus Query API + 分页查询
- **实现位置**：`MilvusService.queryChunksByDocId()` 使用 Query API 替代 similaritySearch
- **验收**：✅ 切片查询支持分页，不随全量向量线性增长

#### 3.1.3 上传入口的 Controller 归口（P2）
- **现状**：上传接口在 `KnowledgeBaseController`（兼容）
- **建议**：评估迁移到 `DocumentController` 或保留但补充清晰说明

---

## 4. API 接口规范总结（按现状）

| 接口 | 方法 | 路径 | 认证 | 状态 |
|------|------|------|------|------|
| 上传文件 | POST | `/api/knowledge/upload/file` | ✅ | ✅ 已实现（兼容入口） |
| 获取文档列表 | GET | `/api/knowledge/document/list` | ✅ | ✅ 已实现 |
| 获取文档信息 | GET | `/api/knowledge/document/{docId}` | ✅ | ✅ 已实现 |
| 获取文档切片详情 | GET | `/api/knowledge/document/detail` | ✅ | ✅ 已实现（性能待优化） |
| 修改文档启用状态 | POST | `/api/knowledge/document/change/status` | ✅ | ✅ 已实现（RAG 检索侧已生效） |
| 重命名文档 | POST | `/api/knowledge/document/rename` | ✅ | ✅ 已实现 |
| 删除文档 | POST | `/api/knowledge/delete/document` | ✅ | ✅ 已实现（Milvus 清理已实现） |
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

**实施方案**（已实现）:
1. **Milvus Query API**（已实现）:
   ```java
   // 使用 MilvusService.queryChunksByDocId() 查询指定文档的所有向量
   List<Document> chunks = milvusService.queryChunksByDocId(docId, limit, offset);
   ```
   - ✅ 已实现：使用 Milvus Query API + JSON_EXTRACT 表达式过滤
   - ✅ 支持分页查询（limit/offset）
   - ✅ 避免全量扫描，性能优化

2. **内容搜索**:
   - 在查询结果基础上进行内存过滤（search 参数）

### 4.6 Milvus 切片删除 ✅ 已实现

**实现状态**: ✅ 已实现 `MilvusService.deleteChunksByDocId()`

**实现方案**:
```java
// 已实现：使用 MilvusService 删除文档的所有向量数据
long deletedCount = milvusService.deleteChunksByDocId(docId);
```

**实现位置**:
- `MilvusService.deleteChunksByDocId()` - 使用 Milvus Delete API + metadata 过滤
- `DocumentService.deleteDocument()` - 删除文档时自动调用
- `KnowledgeBaseController.deleteKnowledgeBase()` - 删除知识库时自动清理所有文档向量
- `UserSettingsController.deleteAccount()` - 注销账号时自动清理所有向量

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

## 5. 数据库设计

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
   - ✅ 模块拆分（已存在 `DocumentController` / `DocumentService`）
   - ✅ JWT 认证集成（userId 从 token 获取）
   - ✅ 文档列表（分页、搜索）+ DTO（snake_case）
   - **补齐**：删除文档/删除知识库时的 Milvus 向量清理
   - **补齐**：切片查询走 Milvus expr 过滤（避免全量拉取）

2. **P1 (重要)**:
   - ✅ 获取文档信息
   - ✅ 修改启用状态（RAG 检索侧已生效）
   - ✅ 重命名文档
   - ✅ 删除文档（Milvus 数据清理已实现）

3. **P2 (可选)**:
   - 上传入口归口（Controller 路由整理）
   - 文档统计信息（总大小、平均切片数等）
   - 批量操作（批量启用/禁用、批量删除）

---

**文档版本**: 1.0  
**最后更新**: 2026-01  
**维护者**: Java 后端开发团队

