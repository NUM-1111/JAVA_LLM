# 用户设置模块开发文档 (User Settings Module)

> 本文档描述用户设置模块的完整实现需求，包括当前已完成功能和待实现功能。

---

## 1. 模块概述

用户设置模块负责用户信息的修改、账号管理等功能。

**技术栈要求**:
- Java 17+
- Spring Boot 3.4.1+
- Spring Data JPA (PostgreSQL)
- JWT 认证

---

## 2. 当前实现状态

### 2.1 已实现功能 ✅

> ✅ 该模块在 Java 后端已实现（此前文档为“计划稿”，现按代码现状更新）。

- **修改用户名**：`POST /api/change/username`
- **修改邮箱**：`POST /api/change/email`
- **获取用户信息**：`GET /api/user/info`（当前返回 `username`）
- **删除所有聊天记录（备用路由）**：`POST /api/user-settings/delete/chat`  
  - 主路由在对话模块：`POST /api/delete/chat`
- **注销账号（级联删除）**：`POST /api/delete/account`

**代码位置**:
- `src/main/java/com/heu/rag/core/controller/UserSettingsController.java`

**实现要点**:
- **JWT 用户身份获取**：通过 `JwtAuthenticationFilter` 将 `userId` 注入 `SecurityContext`（principal 为 `Long`），Controller 内统一从 `SecurityContext` 取 userId。
- **校验规则**：
  - 用户名：3~20 位、字母/数字/下划线、唯一性校验
  - 邮箱：必须为 `@hrbeu.edu.cn` 域、唯一性校验
- **级联删除范围**：
  - MongoDB：Conversation + ChatMessage
  - PostgreSQL：KnowledgeBase + Document + User
  - Milvus：目前仅记录日志提示，**向量删除未实现**（见 `MILVUS_OPTIMIZATION_NOTES.md`）

---

## 3. 待实现功能 ⚠️

### 3.1 用户信息修改功能

#### 3.1.1 修改用户名 (POST /api/change/username)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.5.1
- **请求体**:
  ```json
  {
    "username": "string"
  }
  ```
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": "Username updated successfully"
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询用户
  3. 验证新用户名唯一性（检查数据库中是否存在）
  4. 更新 `username` 字段
  5. 可选：更新 `updated_at` 时间（如果 User 实体有此字段）
  6. 保存并返回
- **实现位置**: 创建 `UserSettingsController.java` 或扩展 `AuthController.java`
- **验证规则**:
   - 用户名长度限制（如 3-20 字符）
   - 用户名格式验证（字母、数字、下划线）
   - 用户名唯一性验证

#### 3.1.2 修改邮箱 (POST /api/change/email)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.5.2
- **请求体**:
  ```json
  {
    "email": "string"
  }
  ```
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": "Email updated successfully"
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询用户
  3. 验证新邮箱格式（必须为 @hrbeu.edu.cn）
  4. 验证新邮箱唯一性（检查数据库中是否存在）
  5. **可选**: 发送验证码到新邮箱进行验证（增强安全性）
  6. 更新 `email` 字段
  7. 可选：更新 `updated_at` 时间
  8. 保存并返回
- **实现位置**: `UserSettingsController.java`
- **验证规则**:
   - 邮箱格式验证（@hrbeu.edu.cn）
   - 邮箱唯一性验证
   - **安全建议**: 要求邮箱验证码验证（可选但推荐）

#### 3.1.3 获取用户信息 (GET /api/user/info)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.2.4 (属于认证模块，但也可放在用户设置模块)
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "username": "string",
      "email": "string" // 可选，可根据需求扩展
    }
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 查询用户信息
  3. 返回用户名（可扩展返回更多信息）
- **实现位置**: `UserSettingsController.java` 或 `AuthController.java`
- **注意**: 已在 `auth_module.md` 中提到，可复用实现

### 3.2 账号管理功能

#### 3.2.1 删除所有聊天记录 (POST /api/delete/chat)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.5.3 (用户设置页面)
- **请求体**: `{}` (空对象)
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": "All chat records deleted successfully"
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 从 MongoDB 查询该用户的所有 Conversation
  3. 删除该用户的所有 Conversation 和 ChatMessage
  4. 可选：清理 Milvus 中的向量数据（如果有隔离）
  5. 返回成功消息
- **实现位置**: `UserSettingsController.java` 或 `ChatController.java`
- **注意**: 该功能实际属于对话模块，但前端放在用户设置页面，建议在 `ChatController` 中实现

#### 3.2.2 注销账号 (POST /api/delete/account)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.5.4
- **请求体**: `{}` (空对象)
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": "Account deleted successfully"
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 获取用户ID
  2. 删除该用户的所有数据（级联删除）:
     - 删除所有 Conversation 和 ChatMessage（MongoDB）
     - 删除所有 KnowledgeBase（PostgreSQL）
     - 删除所有 Document（PostgreSQL）
     - 删除 Milvus 中的向量数据（通过 metadata 过滤）
     - 删除 User 实体（PostgreSQL）
  3. 可选：清理文件系统中的文件（如果有）
  4. 返回成功消息
  5. **注意**: 应使用事务确保数据一致性
- **实现位置**: `UserSettingsController.java`
- **安全建议**:
   - 要求用户再次输入密码确认
   - 或要求邮箱验证码确认
   - 记录删除日志
- **技术难点**:
   - 级联删除所有关联数据
   - Milvus 向量数据清理
   - 事务管理

---

## 4. 技术优化建议

### 4.1 模块组织

**当前问题**: 用户设置功能分散

**实施方案（按现状修正）**:
- 当前已存在 `UserSettingsController`，建议后续保持职责边界：
  - `UserSettingsController`: 用户信息修改、注销账号、（可选）设置页专用“清空聊天记录”别名路由
  - `ConversationController`: 对话与消息管理、清空聊天记录主路由
  - `AuthController`: 登录注册、邮箱验证码、密码重置；`GET /api/user/info` 可统一归口（可选重构）

### 4.2 用户认证集成 ⭐

**实施方案**:
- 所有接口从 JWT token 获取用户ID
- 使用 `@RequestAttribute("userId")` 或 `@AuthenticationPrincipal`
- 示例:
  ```java
  @PostMapping("/change/username")
  public Result<String> changeUsername(
          @RequestBody ChangeUsernameRequest request,
          @RequestAttribute("userId") Long userId) {
      // 实现逻辑
  }
  ```

### 4.3 数据验证

**实施方案**:

1. **用户名验证**:
   ```java
   private void validateUsername(String username) {
       if (username == null || username.trim().isEmpty()) {
           throw new IllegalArgumentException("Username cannot be empty");
       }
       if (username.length() < 3 || username.length() > 20) {
           throw new IllegalArgumentException("Username must be between 3 and 20 characters");
       }
       if (!username.matches("^[a-zA-Z0-9_]+$")) {
           throw new IllegalArgumentException("Username can only contain letters, numbers, and underscores");
       }
       if (userRepository.findByUsername(username).isPresent()) {
           throw new IllegalArgumentException("Username already exists");
       }
   }
   ```

2. **邮箱验证**:
   ```java
   private void validateEmail(String email) {
       if (email == null || email.trim().isEmpty()) {
           throw new IllegalArgumentException("Email cannot be empty");
       }
       if (!email.endsWith("@hrbeu.edu.cn")) {
           throw new IllegalArgumentException("Email must be @hrbeu.edu.cn domain");
       }
       if (userRepository.findByEmail(email).isPresent()) {
           throw new IllegalArgumentException("Email already exists");
       }
   }
   ```

### 4.4 邮箱验证码（可选但推荐）

**实施方案**:
1. 修改邮箱时要求邮箱验证码验证
2. 使用 `/api/send/email` 发送验证码到新邮箱
3. 在 `/api/change/email` 中验证验证码
4. 验证通过后再更新邮箱

### 4.5 账号注销的数据清理 ⭐

**当前问题**: 需要级联删除所有关联数据

**实施方案**:
```java
@PostMapping("/delete/account")
@Transactional
public Result<String> deleteAccount(
        @RequestAttribute("userId") Long userId) {
    
    log.info("Deleting account: userId={}", userId);
    
    // 1. 删除所有 Conversation 和 ChatMessage
    List<Conversation> conversations = conversationRepository.findByUserId(userId);
    for (Conversation conv : conversations) {
        List<ChatMessage> messages = chatMessageRepository.findByConversationId(conv.getConversationId());
        chatMessageRepository.deleteAll(messages);
    }
    conversationRepository.deleteAll(conversations);
    
    // 2. 删除所有 KnowledgeBase 和 Document
    List<KnowledgeBase> knowledgeBases = knowledgeBaseRepository.findByUserId(userId);
    for (KnowledgeBase kb : knowledgeBases) {
        // 删除关联文档
        List<Document> documents = documentRepository.findByBaseId(kb.getBaseId());
        for (Document doc : documents) {
            // 删除 Milvus 中的向量数据
            deleteVectorsByDocId(doc.getDocId());
        }
        documentRepository.deleteAll(documents);
    }
    knowledgeBaseRepository.deleteAll(knowledgeBases);
    
    // 3. 删除 User 实体
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    userRepository.delete(user);
    
    log.info("Account deleted successfully: userId={}", userId);
    return Result.success("Account deleted successfully");
}

private void deleteVectorsByDocId(Long docId) {
    // 使用 Milvus Client 删除向量数据
    // 实现见 document_module.md
}
```

### 4.6 安全增强（可选）

**实施方案**:
1. **修改邮箱时要求验证码**:
   - 发送验证码到新邮箱
   - 验证码存储在 Redis（过期时间: 5分钟）
   - 验证通过后再更新邮箱

2. **注销账号时要求密码确认**:
   ```java
   @PostMapping("/delete/account")
   public Result<String> deleteAccount(
           @RequestBody DeleteAccountRequest request, // 包含 password
           @RequestAttribute("userId") Long userId) {
       
       User user = userRepository.findById(userId)
           .orElseThrow(() -> new ResourceNotFoundException("User not found"));
       
       // 验证密码
       if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
           throw new IllegalArgumentException("Invalid password");
       }
       
       // 执行删除逻辑
       // ...
   }
   ```

3. **记录操作日志**:
   - 记录用户名、邮箱修改日志
   - 记录账号注销日志（在删除前记录）

---

## 5. 数据库设计

### 5.1 User 实体 (已存在)
- **表名**: `users`
- **存储**: PostgreSQL
- **字段**:
  - `id` (Long, Primary Key, Auto Increment)
  - `username` (String, Unique, Not Null)
  - `email` (String, Unique, Not Null)
  - `password` (String, Not Null, BCrypt 加密)
  - `created_at` (LocalDateTime, Not Null)
  - **可选**: `updated_at` (LocalDateTime) - 用于记录最后更新时间

**索引**:
- `username` 唯一索引（已存在）
- `email` 唯一索引（已存在）

---

## 6. API 接口规范总结

| 接口 | 方法 | 路径 | 认证 | 状态 |
|------|------|------|------|------|
| 修改用户名 | POST | `/api/change/username` | ✅ | ✅ 已实现 |
| 修改邮箱 | POST | `/api/change/email` | ✅ | ✅ 已实现 |
| 获取用户信息 | GET | `/api/user/info` | ✅ | ✅ 已实现（当前返回 username） |
| 删除所有聊天记录（主路由） | POST | `/api/delete/chat` | ✅ | ✅ 已实现（见对话模块） |
| 删除所有聊天记录（备用路由） | POST | `/api/user-settings/delete/chat` | ✅ | ✅ 已实现 |
| 注销账号 | POST | `/api/delete/account` | ✅ | ✅ 已实现（Milvus 向量清理待补） |

---

## 7. 前后端对接注意事项

1. **Token 认证**:
   - 所有接口需要 JWT token
   - 请求头: `Authorization: {JWT_TOKEN}`

2. **响应格式**:
   - 统一使用 `Result<T>` 包装:
     ```json
     {
       "code": 200,
       "msg": "success",
       "data": T
     }
     ```

3. **错误处理**:
   - 401 Unauthorized: Token 无效或过期
   - 400 Bad Request: 请求参数错误（如用户名已存在、邮箱格式错误）
   - 500 Internal Server Error: 服务器错误

4. **数据验证**:
   - 用户名: 3-20 字符，字母、数字、下划线
   - 邮箱: 必须为 @hrbeu.edu.cn 格式
   - 唯一性: 用户名和邮箱必须唯一

5. **安全建议**:
   - 修改邮箱时要求验证码验证（可选但推荐）
   - 注销账号时要求密码确认（可选但推荐）
   - 记录重要操作日志

---

## 8. 开发优先级

1. **P0 (必须)**:
   - ✅ 修改用户名
   - ✅ 修改邮箱
   - ✅ 获取用户信息
   - ✅ 注销账号（级联删除已实现；Milvus 向量清理待补）

2. **P1 (重要)**:
   - 补齐“注销账号时 Milvus 向量清理”（见 `MILVUS_OPTIMIZATION_NOTES.md`）
   - 注销账号二次确认（密码或邮箱验证码）

3. **P2 (可选)**:
   - 邮箱修改时验证码验证
   - 操作日志记录
   - 用户信息扩展（返回更多字段）

---

**文档版本**: 1.0  
**最后更新**: 2026-01  
**维护者**: Java 后端开发团队

