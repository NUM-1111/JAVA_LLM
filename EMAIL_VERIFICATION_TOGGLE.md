# 邮箱验证功能开关说明

## 概述

为了方便开发和测试，当前已禁用邮箱验证功能。当需要恢复邮箱验证功能时，只需修改两个配置项即可。

## 当前状态

- ✅ **邮箱验证功能已禁用**
- ✅ 注册时不需要输入验证码
- ✅ 验证码输入框已隐藏

## 如何恢复邮箱验证功能

### 步骤 1: 修改后端配置

**文件**: `src/main/resources/application.yml`

找到以下配置项：

```yaml
email:
  verification:
    enabled: false  # ← 改为 true
```

修改为：

```yaml
email:
  verification:
    enabled: true  # ← 启用邮箱验证
```

### 步骤 2: 修改前端配置

**文件**: `frontend/src/constants.jsx`

找到以下配置项：

```javascript
const EMAIL_VERIFICATION_ENABLED = false;  // ← 改为 true
```

修改为：

```javascript
const EMAIL_VERIFICATION_ENABLED = true;  // ← 启用邮箱验证UI
```

### 步骤 3: 重启服务

1. **重启后端服务**（Spring Boot应用）
2. **重启前端开发服务器**（如果正在运行）

### 步骤 4: 验证功能

1. 访问注册页面
2. 确认验证码输入框已显示
3. 测试发送验证码功能
4. 测试注册流程（需要输入验证码）

## 配置说明

### 后端配置 (`application.yml`)

- **位置**: `email.verification.enabled`
- **类型**: `boolean`
- **默认值**: `false`
- **说明**: 
  - `false`: 禁用邮箱验证，注册时跳过验证码检查
  - `true`: 启用邮箱验证，注册时必须提供有效验证码

### 前端配置 (`constants.jsx`)

- **位置**: `EMAIL_VERIFICATION_ENABLED`
- **类型**: `boolean`
- **默认值**: `false`
- **说明**:
  - `false`: 隐藏验证码输入框，不验证验证码字段
  - `true`: 显示验证码输入框，验证码为必填项

## 注意事项

1. **配置同步**: 确保前后端配置保持一致
   - 如果后端启用但前端禁用：后端会要求验证码，但前端不显示输入框
   - 如果前端启用但后端禁用：前端显示输入框，但后端会忽略验证码

2. **推荐配置**:
   - **开发/测试环境**: 两端都设置为 `false`
   - **生产环境**: 两端都设置为 `true`

3. **功能完整性**: 
   - 发送验证码接口 (`/api/send/email`) 始终可用
   - 验证验证码接口 (`/api/checkcode`) 始终可用
   - 只有注册接口会根据配置决定是否验证验证码

## 代码位置

### 后端代码
- **配置注入**: `src/main/java/com/heu/rag/core/controller/AuthController.java`
  - 变量: `emailVerificationEnabled`
  - 使用位置: `register()` 方法

### 前端代码
- **配置常量**: `frontend/src/constants.jsx`
  - 常量: `EMAIL_VERIFICATION_ENABLED`
- **使用位置**: `frontend/src/components/user/Register.jsx`
  - 表单验证: `validateForm()` 方法
  - UI渲染: 验证码输入框的条件渲染
  - 数据提交: `handleRegister()` 方法

## 恢复成本

- **时间成本**: < 2 分钟（只需修改2个配置值）
- **代码修改**: 0 行（无需修改业务逻辑代码）
- **测试成本**: 需要测试注册流程和验证码功能

---

**最后更新**: 2024  
**维护者**: 开发团队

