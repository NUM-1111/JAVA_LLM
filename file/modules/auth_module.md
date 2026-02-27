# 用户认证模块开发文档 (Authentication Module)

> 本文档用于驱动“认证与账号安全”模块的持续迭代：既描述**已落地实现**，也列出**明确的优化 TODO 与验收标准**。

---

## 1. 模块概述

用户认证模块负责：注册、登录、邮箱验证码、密码重置、（可选）用户信息查询。

**当前技术栈（以代码为准）**:
- Java 17 / Spring Boot 3.4.1
- Spring Security（Stateless）
- JWT：`io.jsonwebtoken:jjwt 0.12.3`
- BCrypt：`PasswordEncoder`（Spring Security）
- Redis：验证码/重置 token 存储（`StringRedisTemplate`）
- Spring Mail：SMTP 发信（`JavaMailSender`）

---

## 2. 当前实现状态（按代码现状更新）

### 2.1 已实现功能 ✅

#### 2.1.1 登录：POST `/api/login`
- **请求**：`{"account":"username_or_email","password":"..."}`（支持用户名或邮箱）
- **响应**：`Result<String>`（data 为 JWT token）
- **关键实现**：
  - BCrypt 校验密码
  - 生成 JWT（claims: `userId`, `username`；subject 为 username）

#### 2.1.2 注册：POST `/api/register`
- **请求**：`{"username":"...","email":"...","password":"...","code":"可选"}`  
  - `code` 是否必填由配置开关决定（见 2.1.5）
- **响应**：注册成功直接返回 JWT（实现“注册即登录”）
- **关键实现**：
  - 邮箱格式校验：仅允许 `@hrbeu.edu.cn`
  - 用户名/邮箱唯一性校验
  - BCrypt 加密存储密码

#### 2.1.3 发送邮箱验证码：POST `/api/send/email`
- **请求**：`{"email":"..."}`（仅允许 `@hrbeu.edu.cn`）
- **行为**：
  - 生成 6 位验证码，写入 Redis：`email:code:{email}`（默认 300s）
  - 使用 SMTP 发信

#### 2.1.4 验证验证码并签发重置 token：POST `/api/checkcode`
- **请求**：`{"email":"...","code":"..."}`  
- **响应**：`Result<String>`（data 为 reset token）
- **行为**：
  - 校验验证码（校验成功会删除验证码 key）
  - 生成 reset token，写入 Redis：
    - `reset:token:{email} -> token`
    - `reset:token:value:{token} -> email`

#### 2.1.5 重置密码：POST `/api/reset/password`
- **请求**：`{"token":"...","newPassword":"..."}`  
- **行为**：
  - 校验 reset token，反查 email
  - 按 email 找用户，BCrypt 更新密码
  - 删除 reset token（email 与 token 的双向 key）

### 2.2 已实现的鉴权基础设施 ✅

- **JWT 配置**：`jwt.secret` / `jwt.expiration`（见 `application.yml`）
- **JWT 工具类**：`JwtTokenUtil`
- **JWT Filter**：`JwtAuthenticationFilter`
  - 从 `Authorization` 头直接读取 token（**无 Bearer 前缀**，与前端约定一致）
  - token 校验通过后，将 `userId` 写入 `SecurityContext` 的 principal（类型为 `Long`）
- **SecurityFilterChain**：放行 `/api/login` `/api/register` `/api/send/email` `/api/checkcode` `/api/reset/password`，其余接口默认需要认证

---

## 3. 关键流程（面试/文档可复用）

### 3.1 登录流程
1. account 判断是否包含 `@`，按 email 或 username 查用户
2. BCrypt 校验密码
3. 签发 JWT（24h 默认）
4. 前端存 `localStorage.auth`，后续请求头：`Authorization: {token}`

### 3.2 注册流程（带开关）
- `email.verification.enabled=false`：跳过验证码校验（开发期）
- `email.verification.enabled=true`：注册必须提供 code 且校验通过（生产期）

### 3.3 密码重置流程
发送验证码 → `/api/checkcode` 换 reset token → `/api/reset/password` 用 token 重置

---

## 4. 待优化与 Roadmap（给 Cursor 分批做）

### 4.1 认证体系统一
- **现状**：`GET /api/user/info` 当前在 `UserSettingsController` 中实现（认证模块可选择统一归口）
- **建议**：把“获取用户信息”归口到 `AuthController`，设置模块仅处理修改类接口

### 4.2 防刷与限流（与简历亮点对齐）
- **现状**：验证码接口未做频控
- **建议**：
  - Redis 计数 + TTL（简单）
  - 或 Redis + Lua 原子限流（更硬核，可写进亮点）

### 4.3 安全配置治理
- **现状**：`application.yml` 中包含默认 SMTP 密码占位
- **建议**：所有敏感配置仅允许从环境变量注入；补充 `.env.example` / 文档说明

### 4.4 Token 体验
- **可选**：refresh token、登出黑名单、单点登录（踢旧 token）等

---

## 5. API 接口规范总结

| 接口 | 方法 | 路径 | 认证 | 状态 |
|------|------|------|------|------|
| 登录 | POST | `/api/login` | ❌ | ✅ 已实现 |
| 注册 | POST | `/api/register` | ❌ | ✅ 已实现（可开关验证码） |
| 发送验证码 | POST | `/api/send/email` | ❌ | ✅ 已实现 |
| 验证验证码 | POST | `/api/checkcode` | ❌ | ✅ 已实现 |
| 重置密码 | POST | `/api/reset/password` | ❌ | ✅ 已实现 |

---

## 6. 验收标准（最小可交付）
- 登录/注册返回 JWT，且受保护接口在未带 token 时返回 401
- 开启 `email.verification.enabled=true` 时：注册必须校验验证码
- `/api/checkcode` 返回的 reset token 在过期后不可用
- 密码重置成功后：旧 reset token 失效、用户可用新密码登录

---

**文档版本**: 2.0  
**最后更新**: 2026-01  
**维护者**: Java 后端开发团队

