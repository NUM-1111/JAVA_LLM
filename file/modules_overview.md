# 模块开发总览文档 (Modules Overview)

> 本文档汇总所有模块的开发状态、优先级和关键信息，用于项目管理和开发规划。

---

## 1. 文档结构

本项目模块化文档包含以下文件：

| 文档文件 | 模块名称 | 描述 |
|---------|---------|------|
| `auth_module.md` | 用户认证模块 | 登录、注册、邮箱验证、密码重置、JWT 认证 |
| `chat_module.md` | 对话模块 | RAG 问答、对话管理、消息历史 |
| `knowledge_base_module.md` | 知识库模块 | 知识库 CRUD、搜索 |
| `document_module.md` | 文档管理模块 | 文档上传、管理、详情、切片查询 |
| `user_settings_module.md` | 用户设置模块 | 用户信息修改、账号管理 |
| `modules_overview.md` | 模块总览 | 本文档，汇总所有模块信息 |

---

## 2. 模块开发状态总览

### 2.1 完成度统计

| 模块 | 已完成功能 | 待实现功能 | 需优化功能 | 完成度 |
|------|-----------|-----------|-----------|--------|
| 用户认证模块 | 5 | 0 | 4 | 75% |
| 对话模块 | 8 | 0 | 3 | 72% |
| 知识库模块 | 5 | 0 | 3 | 70% |
| 文档管理模块 | 6 | 0 | 4 | 70% |
| 用户设置模块 | 5 | 0 | 2 | 80% |

### 2.2 各模块详细状态

#### 用户认证模块 (auth_module.md)
- ✅ **已完成**: 
  - 登录（JWT）(POST /api/login)
  - 注册（可开关验证码）(POST /api/register)
  - 发送邮箱验证码 (POST /api/send/email)
  - 验证验证码并签发 reset token (POST /api/checkcode)
  - 重置密码 (POST /api/reset/password)
- ⚠️ **待实现**: 无（核心闭环已完成）
- 🔧 **需优化**: 
  - 邮件验证码接口防刷/限流（Redis 计数或 Lua 原子限流）
  - 敏感配置治理（SMTP/JWT secret 全部走环境变量）
  - token 体验（refresh token/登出/黑名单：可选）
  - `/api/user/info` 归口统一（目前在 UserSettingsController）

#### 对话模块 (chat_module.md)
- ✅ **已完成**: 
  - 发送消息（SSE + JSON 事件流）(POST /api/new/message)
  - 获取对话信息 (GET /api/get/conversation/{id})
  - 查询消息列表 (POST /api/query/messages)
  - 获取最新消息ID (POST /api/get/latest/id)
  - 查询对话列表 (GET /api/query/conversation)
  - 删除对话 (POST /api/delete/conversation)
  - 重命名对话 (PUT /api/rename/conversation)
  - 删除所有聊天记录 (POST /api/delete/chat)
- ⚠️ **待实现**: 无（接口闭环已完成）
- 🔧 **需优化**: 
  - RAG 检索隔离：按 baseId 过滤向量，避免“串库检索”（P0）
  - 文档启用状态 isEnabled 纳入检索过滤（P1）
  - 思考过程 `</think>` 分离与返回（P1）

#### 知识库模块 (knowledge_base_module.md)
- ✅ **已完成**: 
  - 创建知识库 (POST /api/knowledge/create)
  - 获取知识库列表 (GET /api/knowledge/list)
  - 获取知识库详情 (GET /api/knowledge/info/{baseId})
  - 编辑知识库 (PUT /api/knowledge/edit/{baseId})
  - 搜索知识库 (POST /api/knowledge/search)
- 🔧 **需优化**: 
  - 删除知识库时的 Milvus 向量清理（P0）
  - 分页/排序（list/search）
  - 统一异常与错误码

#### 文档管理模块 (document_module.md)
- ✅ **已完成**: 
  - 文件上传&解析&向量化 (POST /api/knowledge/upload/file)
  - 获取文档列表（分页+搜索）(GET /api/knowledge/document/list)
  - 获取文档信息 (GET /api/knowledge/document/{docId})
  - 获取文档切片详情 (GET /api/knowledge/document/detail)
  - 修改文档启用状态 (POST /api/knowledge/document/change/status)
  - 重命名文档 (POST /api/knowledge/document/rename)
- 🔧 **需优化**: 
  - 删除文档/知识库时的 Milvus 向量清理（P0）
  - 切片查询性能：避免 topK 全量拉取后内存过滤（P0/P1）
  - upload 路由归口说明（目前在 KnowledgeBaseController，属于兼容设计）

#### 用户设置模块 (user_settings_module.md)
- ✅ **已完成**:
  - 修改用户名 (POST /api/change/username)
  - 修改邮箱 (POST /api/change/email)
  - 获取用户信息 (GET /api/user/info)
  - 注销账号（级联删除）(POST /api/delete/account)
  - 清空聊天记录（备用路由）(POST /api/user-settings/delete/chat)
- 🔧 **需优化**:
  - 注销账号时的 Milvus 向量清理（当前仅日志提示）
  - 二次确认（密码/邮箱验证码）与操作审计日志（可选）

---

## 3. 开发优先级

### 3.1 P0 优先级（必须完成，基础功能）

1. **RAG 检索隔离（防串库）** (chat_module.md)
   - 向量检索按 `baseId`（必要时按 `docId/isEnabled`）过滤
   - 方案：Milvus Java SDK Query/Search + expr（推荐）

2. **Milvus 向量数据生命周期管理** (document_module.md / knowledge_base_module.md / user_settings_module.md)
   - 删除文档/知识库/账号时同步删除 Milvus 向量
   - 优化切片查询：避免 `topK(10000)` 全量拉取后内存过滤

3. **邮件验证码防刷/限流** (auth_module.md)
   - Redis 计数或 Lua 原子限流（与简历亮点可对齐）

### 3.2 P1 优先级（重要功能）

1. **邮箱验证码功能** (auth_module.md)
   - 发送邮箱验证码
   - 验证邮箱验证码
   - 密码重置

2. **对话管理功能** (chat_module.md)
   - 获取对话信息
   - 查询对话列表
   - 查询消息列表
   - 获取最新消息ID

3. **知识库完整功能** (knowledge_base_module.md)
   - 获取知识库详情
   - 编辑知识库
   - 搜索知识库
   - 删除时关联数据清理

4. **文档管理完整功能** (document_module.md)
   - 获取文档信息
   - 修改文档启用状态
   - 重命名文档
   - 删除文档

5. **用户设置功能** (user_settings_module.md)
   - 修改用户名
   - 修改邮箱
   - 获取用户信息

### 3.3 P2 优先级（可选功能）

1. **对话高级功能** (chat_module.md)
   - 删除对话
   - 重命名对话
   - 删除所有聊天记录
   - 思考过程支持

2. **文档高级功能** (document_module.md)
   - 获取文档切片详情（Milvus 查询）
   - 文档统计信息
   - 批量操作

3. **用户设置高级功能** (user_settings_module.md)
   - 注销账号（级联删除）
   - 邮箱修改时验证码验证
   - 注销账号时密码确认
   - 操作日志记录

---

## 4. 技术债务和优化建议

### 4.1 全局技术债务

1. **认证系统统一** ⭐⭐⭐
   - **问题**: 当前使用 UUID token，应使用 JWT
   - **影响**: 所有需要认证的接口
   - **优先级**: P0
   - **模块**: auth_module.md

2. **响应格式统一** ⭐⭐⭐
   - **问题**: 字段名使用 camelCase，前端期望 snake_case
   - **影响**: 所有接口
   - **优先级**: P0
   - **模块**: knowledge_base_module.md, document_module.md

3. **用户ID获取方式统一** ⭐⭐⭐
   - **问题**: 当前通过请求参数传递 userId，应从 JWT 获取
   - **影响**: 所有需要用户ID的接口
   - **优先级**: P0
   - **模块**: 所有模块

4. **模块拆分** ⭐⭐
   - **问题**: 文档相关接口放在 KnowledgeBaseController 中
   - **影响**: 文档管理模块
   - **优先级**: P0
   - **模块**: document_module.md

5. **密码加密** ⭐⭐⭐
   - **问题**: 密码明文存储
   - **影响**: 用户安全
   - **优先级**: P0
   - **模块**: auth_module.md

### 4.2 模块间依赖关系

1. **JWT 认证系统** → 所有模块
   - 必须先实现 JWT 认证，其他模块才能集成

2. **用户认证模块** → 所有模块
   - 所有模块都需要用户认证

3. **知识库模块** → 文档管理模块
   - 文档管理需要验证知识库所有权

4. **对话模块** → 知识库模块
   - 对话需要验证知识库所有权（baseId）

5. **文档管理模块** → 知识库模块
   - 文档管理需要验证知识库所有权

---

## 5. 前后端对接注意事项

### 5.1 认证方式

- **前端**: 使用 `localStorage.auth` 存储 JWT token
- **后端**: JWT token 通过 `Authorization` 头传递（无 Bearer 前缀）
- **格式**: `Authorization: {JWT_TOKEN}`

### 5.2 响应格式

- **统一格式**: 所有接口使用 `Result<T>` 包装
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": T
  }
  ```
- **字段名**: 前端期望 snake_case，后端数据库使用 camelCase，需要在 DTO 层转换

### 5.3 分页参数

- **前端使用**: `limit` 和 `offset`
- **后端实现**: 使用 Spring Data JPA 的 `Pageable`
- **默认值**: `limit=10`, `offset=0`

### 5.4 错误处理

- **401 Unauthorized**: Token 无效或过期，前端应清除 `localStorage.auth` 并跳转登录页
- **400 Bad Request**: 请求参数错误
- **403 Forbidden**: 无权限访问资源
- **404 Not Found**: 资源不存在
- **500 Internal Server Error**: 服务器错误

---

## 6. 开发建议

### 6.1 开发顺序建议

1. **第一阶段（P0）**: 
   - 实现 JWT 认证系统
   - 密码加密
   - 优化现有接口（认证集成、响应格式）

2. **第二阶段（P1）**: 
   - 实现用户认证完整功能（邮箱验证码、密码重置）
   - 实现对话管理功能
   - 实现知识库完整功能
   - 实现文档管理完整功能
   - 实现用户设置功能

3. **第三阶段（P2）**: 
   - 实现高级功能和优化
   - 性能优化
   - 安全增强

### 6.2 开发注意事项

1. **代码规范**:
   - 遵循 Spring Boot 最佳实践
   - 使用 Lombok 减少样板代码
   - 统一异常处理

2. **测试**:
   - 单元测试覆盖核心业务逻辑
   - 集成测试覆盖 API 接口
   - 端到端测试覆盖关键流程

3. **文档**:
   - 保持代码注释清晰
   - 更新 API 文档
   - 记录重要决策和变更

4. **安全**:
   - 所有用户输入验证
   - SQL 注入防护（使用 JPA）
   - XSS 防护
   - CSRF 防护（如果使用 session）

---

## 7. 关键依赖和配置

### 7.1 必需依赖

```xml
<!-- JWT -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>

<!-- Spring Security (可选，用于密码加密) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- Spring Mail (邮箱验证码) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>

<!-- Redis (验证码存储) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### 7.2 配置文件

- `application.yml`: 数据库、Redis、邮件服务器配置
- JWT 配置: 密钥、过期时间
- 邮件配置: SMTP 服务器、用户名、密码

---

## 8. 参考文档

- **前端架构文档**: `frontend/FRONTEND_ARCH.md`
- **API 文档**: `API.md`
- **模块文档**: `file/auth_module.md`, `file/chat_module.md`, `file/knowledge_base_module.md`, `file/document_module.md`, `file/user_settings_module.md`

---

**文档版本**: 1.0  
**最后更新**: 2024  
**维护者**: Java 后端开发团队

