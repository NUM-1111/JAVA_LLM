# 知识库模块开发文档 (Knowledge Base Module)

> 本文档描述知识库模块的完整实现需求，包括当前已完成功能和待实现功能。

---

## 1. 模块概述

知识库模块负责知识库的创建、查询、编辑、删除、搜索等核心功能。

**技术栈要求**:
- Java 17+
- Spring Boot 3.4.1+
- Spring Data JPA (PostgreSQL)
- Snowflake ID 生成器

---

## 2. 当前实现状态

### 2.1 已实现功能 ✅

#### 2.1.1 创建知识库 (POST /api/knowledge/create)
- **文件位置**: `src/main/java/com/heu/rag/core/controller/KnowledgeBaseController.java`
- **实现状态**: ✅ 基础实现完成
- **当前功能**:
  - 使用 Snowflake ID 生成 baseId
  - 保存到 PostgreSQL
- **当前问题**:
  1. **请求格式不匹配**:
     - 当前: `@RequestParam Long userId` + `@RequestBody BaseCreateRequest`
     - 前端期望: `{"base_name": "string", "base_desc": "string"}` (userId 从 JWT 获取)
  2. **缺少用户验证**: 应从 JWT token 获取 userId，而不是通过参数传递

#### 2.1.2 获取知识库列表 (GET /api/knowledge/list)
- **文件位置**: `src/main/java/com/heu/rag/core/controller/KnowledgeBaseController.java`
- **实现状态**: ✅ 基础实现完成
- **当前问题**:
  1. **请求格式不匹配**:
     - 当前: `@RequestParam Long userId`
     - 前端期望: 无参数（userId 从 JWT 获取）
  2. **响应格式**:
     - 当前: `List<KnowledgeBase>`
     - 前端期望: `{"total": number, "data": [...]}`
  3. **字段名不一致**:
     - 数据库: `baseName`, `baseDesc`
     - 前端期望: `base_name`, `base_desc` (snake_case)

#### 2.1.3 删除知识库 (DELETE /api/knowledge/delete/{id})
- **文件位置**: `src/main/java/com/heu/rag/core/controller/KnowledgeBaseController.java`
- **实现状态**: ✅ 基础实现完成
- **当前问题**:
  1. **缺少用户权限验证**: 应验证知识库是否属于当前用户
  2. **缺少关联数据清理**: 删除知识库时应删除关联的文档和向量数据

#### 2.1.4 获取文档列表 (GET /api/knowledge/document/list)
- **文件位置**: `src/main/java/com/heu/rag/core/controller/KnowledgeBaseController.java`
- **实现状态**: ✅ 基础实现完成
- **当前问题**:
  - 该接口实际属于文档管理模块，但放在知识库 Controller 中
  - 应移至文档管理模块

---

## 3. 待实现功能 ⚠️

### 3.1 知识库查询功能

#### 3.1.1 获取知识库详情 (GET /api/knowledge/info/:baseId)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.3.6
- **路径参数**: `baseId` (Long)
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "baseId": "string",
      "base_name": "string",
      "base_desc": "string"
    }
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询知识库
  3. 验证知识库属于当前用户
  4. 返回知识库信息（使用 snake_case 字段名）
- **实现位置**: `KnowledgeBaseController.java`

#### 3.1.2 搜索知识库 (POST /api/knowledge/search)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.3.5
- **请求体**:
  ```json
  {
    "base_name": "string"
  }
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
          "baseId": "string",
          "base_name": "string",
          "base_desc": "string"
        }
      ]
    }
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 根据 `base_name` 模糊查询（使用 `LIKE` 或 `ILIKE`）
  3. 只查询当前用户的知识库
  4. 返回匹配结果（使用 snake_case 字段名）
- **实现位置**: `KnowledgeBaseController.java`
- **SQL 示例**:
  ```sql
  SELECT * FROM knowledge_bases 
  WHERE user_id = ? AND base_name ILIKE '%?%'
  ORDER BY updated_at DESC
  ```

### 3.2 知识库编辑功能

#### 3.2.1 编辑知识库 (PUT /api/knowledge/edit/:baseId)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.3.3
- **路径参数**: `baseId` (Long)
- **请求体**:
  ```json
  {
    "base_name": "string",
    "base_desc": "string"
  }
  ```
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**: 成功消息或更新后的知识库信息
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询知识库
  3. 验证知识库属于当前用户
  4. 更新 `baseName` 和 `baseDesc`
  5. 更新 `updatedAt` 时间
  6. 保存并返回
- **实现位置**: `KnowledgeBaseController.java`

---

## 4. 技术优化建议

### 4.1 用户认证集成 ⭐

**当前问题**: userId 通过请求参数传递，不安全

**实施方案**:
1. **添加 JWT 认证中间件**:
   - 创建 `JwtAuthenticationFilter` 拦截 `/api/knowledge/**` 路径
   - 从 JWT token 解析用户ID
   - 设置到 `SecurityContext` 或 `RequestAttributes`

2. **Controller 方法调整**:
   ```java
   @GetMapping("/list")
   public Result<Map<String, Object>> listKnowledgeBases(
           @AuthenticationPrincipal Long userId) {
       // 或使用 @RequestAttribute("userId") Long userId
       List<KnowledgeBase> knowledgeBases = knowledgeBaseRepository.findByUserId(userId);
       // 转换为前端格式
       return Result.success(formatResponse(knowledgeBases));
   }
   ```

3. **用户权限验证**:
   ```java
   private void verifyOwnership(Long baseId, Long userId) {
       KnowledgeBase kb = knowledgeBaseRepository.findById(baseId)
           .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found"));
       if (!kb.getUserId().equals(userId)) {
           throw new IllegalArgumentException("User does not have access to this knowledge base");
       }
   }
   ```

### 4.2 响应格式统一 ⭐

**当前问题**: 字段名使用 camelCase，前端期望 snake_case

**实施方案**:

**方案1: DTO 转换（推荐）**
```java
// 创建 DTO 类
@Data
public class KnowledgeBaseDTO {
    private Long baseId;
    @JsonProperty("base_name")
    private String baseName;
    @JsonProperty("base_desc")
    private String baseDesc;
    
    public static KnowledgeBaseDTO from(KnowledgeBase kb) {
        return KnowledgeBaseDTO.builder()
            .baseId(kb.getBaseId())
            .baseName(kb.getBaseName())
            .baseDesc(kb.getBaseDesc())
            .build();
    }
}

// Controller 中使用
@GetMapping("/list")
public Result<Map<String, Object>> listKnowledgeBases(@RequestAttribute("userId") Long userId) {
    List<KnowledgeBase> kbs = knowledgeBaseRepository.findByUserId(userId);
    List<KnowledgeBaseDTO> dtos = kbs.stream()
        .map(KnowledgeBaseDTO::from)
        .collect(Collectors.toList());
    
    Map<String, Object> response = new HashMap<>();
    response.put("total", dtos.size());
    response.put("data", dtos);
    return Result.success(response);
}
```

**方案2: Jackson 配置全局转换**
```yaml
# application.yml
spring:
  jackson:
    property-naming-strategy: SNAKE_CASE
```
注意：此方案会影响所有响应，可能影响其他模块

### 4.3 删除时关联数据清理

**当前问题**: 删除知识库时没有清理关联数据

**实施方案**:
```java
@DeleteMapping("/delete/{id}")
@Transactional
public Result<String> deleteKnowledgeBase(
        @PathVariable Long id,
        @RequestAttribute("userId") Long userId) {
    
    // 1. 验证权限
    KnowledgeBase kb = knowledgeBaseRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found"));
    verifyOwnership(id, userId);
    
    // 2. 删除关联文档（可选：级联删除）
    List<Document> documents = documentRepository.findByBaseId(id);
    for (Document doc : documents) {
        // 删除 Milvus 中的向量数据（通过 metadata 过滤）
        vectorStore.delete(doc.getDocId().toString());
        // 删除文档记录
        documentRepository.delete(doc);
    }
    
    // 3. 删除知识库
    knowledgeBaseRepository.delete(kb);
    
    return Result.success("Knowledge base deleted successfully");
}
```

### 4.4 分页支持（可选）

**当前问题**: 列表查询没有分页

**实施方案**:
```java
@GetMapping("/list")
public Result<Map<String, Object>> listKnowledgeBases(
        @RequestAttribute("userId") Long userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
    
    Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
    Page<KnowledgeBase> pageResult = knowledgeBaseRepository.findByUserId(userId, pageable);
    
    Map<String, Object> response = new HashMap<>();
    response.put("total", pageResult.getTotalElements());
    response.put("data", pageResult.getContent().stream()
        .map(KnowledgeBaseDTO::from)
        .collect(Collectors.toList()));
    return Result.success(response);
}
```

---

## 5. 数据库设计

### 5.1 KnowledgeBase 实体 (已存在)
- **表名**: `knowledge_bases`
- **存储**: PostgreSQL
- **字段**:
  - `base_id` (Long, Primary Key, Snowflake ID)
  - `user_id` (Long, Foreign Key, Not Null)
  - `base_name` (String, Not Null)
  - `base_desc` (String, Nullable)
  - `base_path` (String, Nullable)
  - `created_at` (LocalDateTime, Not Null)
  - `updated_at` (LocalDateTime)

**索引建议**:
- `user_id` 索引（用于查询用户的知识库列表）
- `base_name` 索引（用于搜索，可创建全文索引）

---

## 6. API 接口规范总结

| 接口 | 方法 | 路径 | 认证 | 状态 |
|------|------|------|------|------|
| 创建知识库 | POST | `/api/knowledge/create` | ✅ | ✅ 需优化 |
| 获取知识库列表 | GET | `/api/knowledge/list` | ✅ | ✅ 需优化 |
| 获取知识库详情 | GET | `/api/knowledge/info/:baseId` | ✅ | ⚠️ 待实现 |
| 编辑知识库 | PUT | `/api/knowledge/edit/:baseId` | ✅ | ⚠️ 待实现 |
| 删除知识库 | DELETE | `/api/knowledge/delete/:baseId` | ✅ | ✅ 需优化 |
| 搜索知识库 | POST | `/api/knowledge/search` | ✅ | ⚠️ 待实现 |

---

## 7. 前后端对接注意事项

1. **字段名格式**:
   - 前端使用 snake_case: `base_name`, `base_desc`
   - 后端数据库使用 camelCase: `baseName`, `baseDesc`
   - 需要在 DTO 层进行转换

2. **响应格式**:
   - 列表接口返回: `{"total": number, "data": [...]}`
   - 单个对象返回: `{"code": 200, "msg": "success", "data": {...}}`

3. **用户ID获取**:
   - 所有接口从 JWT token 获取用户ID
   - 不再通过请求参数传递 userId

4. **权限验证**:
   - 所有操作都需要验证知识库属于当前用户
   - 返回 403 Forbidden 或 404 Not Found（隐藏存在性）

5. **删除操作**:
   - 删除知识库时应同时删除关联的文档和向量数据
   - 考虑是否需要软删除（is_deleted 标记）

---

## 8. 开发优先级

1. **P0 (必须)**:
   - JWT 认证集成（userId 从 token 获取）
   - 响应格式优化（DTO 转换，snake_case）
   - 创建知识库接口优化

2. **P1 (重要)**:
   - 获取知识库详情
   - 编辑知识库
   - 搜索知识库
   - 删除时关联数据清理

3. **P2 (可选)**:
   - 分页支持
   - 软删除
   - 知识库统计信息（文档数量、总大小等）

---

**文档版本**: 1.0  
**最后更新**: 2024  
**维护者**: Java 后端开发团队

