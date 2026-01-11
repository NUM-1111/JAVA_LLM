# 用户认证模块开发文档 (Authentication Module)

> 本文档描述用户认证模块的完整实现需求，包括当前已完成功能和待实现功能。

---

## 1. 模块概述

用户认证模块负责用户注册、登录、邮箱验证、密码重置等核心认证功能。

**技术栈要求**:
- Java 17+
- Spring Boot 3.4.1+
- Spring Security (推荐，用于JWT)
- JWT (JSON Web Token) 替代 Go 后端的 Session 机制
- BCrypt 用于密码加密

---

## 2. 当前实现状态

### 2.1 已实现功能 ✅

#### 2.1.1 基础登录 (POST /api/login)
- **文件位置**: `src/main/java/com/heu/rag/core/controller/AuthController.java`
- **实现状态**: ✅ 基础实现完成
- **当前问题**:
  - 使用 UUID 作为 token，需要替换为 JWT
  - 密码明文存储，需要加密
  - 缺少用户ID与token的关联
  - 请求格式：`{"username": "string", "password": "string"}`
  - 前端期望格式：`{"account": "string", "password": "string"}` (支持邮箱或用户名)

#### 2.1.2 基础注册 (POST /api/register)
- **文件位置**: `src/main/java/com/heu/rag/core/controller/AuthController.java`
- **实现状态**: ✅ 基础实现完成
- **当前问题**:
  - 密码明文存储，需要加密
  - 缺少邮箱验证码校验
  - 缺少邮箱格式验证（@hrbeu.edu.cn）
  - 请求体缺少 `code` 字段（验证码）

---

## 3. 待实现功能 ⚠️

### 3.1 邮箱验证码功能

#### 3.1.1 发送邮箱验证码 (POST /api/send/email)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.2.3
- **请求体**:
  ```json
  {
    "email": "string"
  }
  ```
- **响应**: 成功消息（不需要返回验证码）
- **业务逻辑**:
  1. 验证邮箱格式（必须为 @hrbeu.edu.cn）
  2. 生成6位数字验证码
  3. 存储验证码到 Redis（key: `email:code:{email}`, 过期时间: 5分钟）
  4. 发送邮件（使用 SMTP，可集成 Spring Mail）
- **依赖**: 
  - Redis (用于验证码存储)
  - Spring Mail (用于发送邮件)
- **实现建议**:
  - 创建 `EmailService` 服务类
  - 使用 RedisTemplate 存储验证码
  - 配置邮件服务器（Gmail/SMTP）

#### 3.1.2 验证邮箱验证码 (POST /api/checkcode)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.6.1 (用于密码重置)
- **请求体**:
  ```json
  {
    "email": "string",
    "code": "string"
  }
  ```
- **响应**: 
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": "reset_token_string" // 用于后续密码重置
  }
  ```
- **业务逻辑**:
  1. 从 Redis 获取验证码
  2. 校验验证码是否正确
  3. 生成密码重置 token（UUID 或 JWT，过期时间: 15分钟）
  4. 存储重置 token 到 Redis（key: `reset:token:{email}`, value: token）
  5. 返回 token 给前端
- **注意**: 该接口用于密码重置流程，注册时的验证码校验在注册接口中完成

### 3.2 密码重置功能

#### 3.2.1 重置密码 (POST /api/reset/password)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.6.2
- **请求体**:
  ```json
  {
    "token": "string", // 从 /api/checkcode 获取
    "newPassword": "string"
  }
  ```
- **响应**: 成功消息
- **业务逻辑**:
  1. 从 Redis 验证 token 有效性
  2. 根据 token 获取邮箱
  3. 查找用户并更新密码（使用 BCrypt 加密）
  4. 删除 Redis 中的 token
  5. 可选：清除用户所有登录 session

### 3.3 用户信息查询

#### 3.3.1 获取用户信息 (GET /api/user/info)
- **前端需求**: `frontend/FRONTEND_ARCH.md` 3.2.4
- **请求头**: `Authorization: JWT_TOKEN`
- **响应**:
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "username": "string"
    }
  }
  ```
- **业务逻辑**:
  1. 从 JWT token 解析用户ID
  2. 查询用户信息
  3. 返回用户名（可扩展返回更多信息）
- **认证**: 需要 JWT 认证中间件

---

## 4. 技术优化建议

### 4.1 JWT 认证替代 Session ⭐

**当前问题**: Go 后端使用 Session + UUID token，Java 后端应使用 JWT 更合适

**实施方案**:

1. **添加依赖** (`pom.xml`):
   ```xml
   <dependency>
       <groupId>io.jsonwebtoken</groupId>
       <artifactId>jjwt-api</artifactId>
       <version>0.12.3</version>
   </dependency>
   <dependency>
       <groupId>io.jsonwebtoken</groupId>
       <artifactId>jjwt-impl</artifactId>
       <version>0.12.3</version>
       <scope>runtime</scope>
   </dependency>
   <dependency>
       <groupId>io.jsonwebtoken</groupId>
       <artifactId>jjwt-jackson</artifactId>
       <version>0.12.3</version>
       <scope>runtime</scope>
   </dependency>
   ```

2. **JWT 配置类** (`JwtConfig.java`):
   ```java
   @Configuration
   public class JwtConfig {
       @Value("${jwt.secret:your-secret-key-at-least-256-bits}")
       private String secret;
       
       @Value("${jwt.expiration:86400000}") // 24小时
       private Long expiration;
       
       // JwtTokenUtil Bean
   }
   ```

3. **JWT 工具类** (`JwtTokenUtil.java`):
   - `generateToken(Long userId, String username)`: 生成 token
   - `validateToken(String token)`: 验证 token
   - `getUserIdFromToken(String token)`: 提取用户ID
   - `getUsernameFromToken(String token)`: 提取用户名

4. **JWT 认证过滤器** (`JwtAuthenticationFilter.java`):
   - 拦截 `/api/**` 路径（排除 `/api/login`, `/api/register`, `/api/send/email`, `/api/checkcode`, `/api/reset/password`）
   - 从 `Authorization` 头提取 token
   - 验证 token 并设置 SecurityContext

5. **登录接口修改**:
   - 登录成功后生成 JWT token 而不是 UUID
   - 返回格式保持不变（前端使用 `localStorage.auth` 存储）

6. **兼容性说明**:
   - 前端期望在 `Authorization` 头中接收 token（已在 `FRONTEND_ARCH.md` 中说明）
   - 前端不需要修改代码，只需后端返回 JWT 而不是 UUID

### 4.2 密码加密 ⭐

**当前问题**: 密码明文存储

**实施方案**:
1. 使用 BCrypt 加密（Spring Security 内置支持）
2. 注册时加密密码
3. 登录时使用 `BCryptPasswordEncoder.matches()` 验证

### 4.3 请求格式调整

**登录接口调整**:
- 前端发送: `{"account": "string", "password": "string"}` (account 可以是邮箱或用户名)
- 后端需要支持两种登录方式:
  1. 通过用户名登录: `userRepository.findByUsername(account)`
  2. 通过邮箱登录: `userRepository.findByEmail(account)`
  3. 优先尝试用户名，失败则尝试邮箱

**注册接口调整**:
- 前端发送: `{"email": "string", "code": "string", "username": "string", "password": "string"}`
- 后端需要:
  1. 验证邮箱格式（@hrbeu.edu.cn）
  2. 从 Redis 验证邮箱验证码
  3. 验证用户名和邮箱唯一性
  4. 密码加密后存储

---

## 5. API 接口规范总结

| 接口 | 方法 | 路径 | 认证 | 状态 |
|------|------|------|------|------|
| 用户登录 | POST | `/api/login` | ❌ | ✅ 需优化 |
| 用户注册 | POST | `/api/register` | ❌ | ✅ 需优化 |
| 发送验证码 | POST | `/api/send/email` | ❌ | ⚠️ 待实现 |
| 验证验证码 | POST | `/api/checkcode` | ❌ | ⚠️ 待实现 |
| 重置密码 | POST | `/api/reset/password` | ❌ | ⚠️ 待实现 |
| 获取用户信息 | GET | `/api/user/info` | ✅ | ⚠️ 待实现 |

---

## 6. 数据库设计

### 6.1 User 实体 (已存在)
- **表名**: `users`
- **字段**:
  - `id` (Long, Primary Key, Auto Increment)
  - `username` (String, Unique, Not Null)
  - `email` (String, Unique, Not Null)
  - `password` (String, Not Null) - **需要加密存储**
  - `created_at` (LocalDateTime, Not Null)

---

## 7. 前后端对接注意事项

1. **Token 存储**:
   - 前端使用 `localStorage.auth` 存储 JWT token
   - 前端在 `Authorization` 头中发送: `Authorization: {token}` (无 Bearer 前缀)

2. **响应格式**:
   - 所有接口统一使用 `Result<T>` 包装:
     ```json
     {
       "code": 200,
       "msg": "success",
       "data": T
     }
     ```

3. **错误处理**:
   - 401 Unauthorized: Token 无效或过期，前端应清除 `localStorage.auth` 并跳转登录页
   - 400 Bad Request: 请求参数错误
   - 500 Internal Server Error: 服务器错误

4. **邮箱验证码流程**:
   - 注册: 发送验证码 → 注册时验证码校验（在注册接口内）
   - 密码重置: 发送验证码 → `/api/checkcode` 验证 → `/api/reset/password` 重置

---

## 8. 开发优先级

1. **P0 (必须)**:
   - JWT 认证实现
   - 密码加密
   - 登录接口支持邮箱/用户名
   - 注册接口支持验证码

2. **P1 (重要)**:
   - 发送邮箱验证码
   - 验证验证码（密码重置用）
   - 密码重置功能
   - 获取用户信息接口

3. **P2 (可选)**:
   - 邮箱格式严格验证
   - Token 刷新机制
   - 登录日志记录

---

**文档版本**: 1.0  
**最后更新**: 2024  
**维护者**: Java 后端开发团队

