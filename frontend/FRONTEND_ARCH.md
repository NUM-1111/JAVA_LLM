# 前端架构技术文档

> 本文档旨在帮助后端开发者快速理解前端的路由结构、数据交互方式和 API 调用清单，以便进行后端接口重构。

---

## 1. 技术栈概览 (Tech Stack)

### 1.1 核心框架与构建工具

- **React**: `^19.0.0` - 前端 UI 框架
- **Vite**: `^6.2.0` - 构建工具与开发服务器
- **React Router DOM**: `^7.3.0` - 客户端路由管理

### 1.2 样式与 UI 组件库

- **Tailwind CSS**: `^3.4.17` - 原子化 CSS 框架
- **Ant Design**: `^5.24.9` - 企业级 UI 组件库
- **antd-style**: `^3.7.1` - Ant Design 样式增强

### 1.3 核心依赖

- **axios**: `^1.8.4` - HTTP 客户端（部分接口使用）
- **eventsource-parser**: `^3.0.0` - SSE (Server-Sent Events) 流式响应解析
- **react-markdown**: `^10.1.0` - Markdown 渲染
- **react-toastify**: `^11.0.5` - 消息提示组件
- **uuid**: `^11.1.0` - 生成唯一标识符

### 1.4 构建与运行

```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build

# 预览构建产物
pnpm preview
```

**注意**: 项目使用 `pnpm` 作为包管理器，开发服务器默认运行在 Vite 配置的端口（通常为 5173）。

---

## 2. 路由与组件映射 (Route Map)

基于 `src/App.jsx` 的路由配置，前端应用的路由结构如下：

| URL 路径 | 对应组件 (Component) | 功能描述 | 鉴权要求 (Auth) |
| --- | --- | --- | --- |
| `/` | `NewChat.jsx` | 新建对话页面，用户输入首条消息后跳转到对话页 | 需要 Token |
| `/login` | `user/Login.jsx` | 用户登录页面 | 无 |
| `/register` | `user/Register.jsx` | 用户注册页面（需邮箱验证码） | 无 |
| `/c/:conversation_id` | `Conversation.jsx` | 核心对话页面，支持流式响应（SSE） | 需要 Token |
| `/settings` | `user/Setting.jsx` | 用户设置页面（修改用户名、邮箱、删除聊天记录、注销账号） | 需要 Token |
| `/forgot-password` | `user/ForgotPassword.jsx` | 忘记密码页面（三步流程：发送验证码 → 验证码校验 → 重置密码） | 无 |
| `/introduce` | `IntroducePage.jsx` | 关于我们页面 | 无 |
| `/knowledge` | `KnowBase.jsx` | 知识库列表页面（创建、编辑、删除、搜索知识库） | 需要 Token |
| `/knowledge/dataset` | `DatasetPage.jsx` | 数据集管理页面（文件列表、上传、重命名、删除、启用/禁用） | 需要 Token |
| `/knowledge/dataset/detail` | `FileShowPage.jsx` | 文档详情页面（查看文档切片内容） | 需要 Token |

**路由说明**:
- 所有需要鉴权的路由在访问前会检查 `localStorage.auth` 和 `localStorage.loginStatus`，未登录会提示并可能跳转到 `/login`
- 路由参数通过 `useParams()` 或 URL 查询参数（`useSearchParams()`）获取

---

## 3. 核心 API 调用清单 (API Integration Layer)

### 3.1 对话模块 (Chat)

#### 3.1.1 发送消息（流式响应）

- **前端触发点**: `handleSendMessage` in `Conversation.jsx` (line 255)
- **后端接口**: `POST /api/new/message`
- **请求头 (Headers)**:
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "localStorage.auth"
  }
  ```
- **请求载荷 (Payload)**:
  ```json
  {
    "action": "next",
    "message": {
      "author": { "role": "user" },
      "content": {
        "content_type": "text",
        "text": "用户输入的消息内容"
      },
      "status": "finished_successfully"
    },
    "message_id": "uuid()",
    "conversation_id": "string",
    "baseId": "string | null",
    "parent": "string | null",
    "model": "DeepSeek-R1 | QwQ-32B",
    "use_deep_think": true | false,
    "created_at": "ISO 8601 时间戳"
  }
  ```
- **响应处理**:
  - **Content-Type**: `text/event-stream` (SSE 流式响应)
  - **解析流程**:
    1. 使用 `TextDecoderStream` 解码 UTF-8 文本
    2. 通过 `EventSourceParserStream` 解析 SSE 事件流
    3. 在 `processSSE` 函数中处理事件：
       - `type: "answer_chunk"`: 追加内容到 `thinkText` 或 `text`（根据 `thinking` 标志）
       - `type: "status"`: 更新状态（如 `thinkTitle`），当 `message === "ANSWER_DONE"` 时结束流
       - `type: "error"`: 错误处理
    4. 特殊标记 `</think>` 用于分隔思考文本和回答文本
  - **流式结束后**: 调用 `POST /api/get/latest/id` 获取最新消息 ID 并更新消息状态

#### 3.1.2 获取对话信息

- **前端触发点**: `useEffect` in `Conversation.jsx` (line 120)
- **后端接口**: `GET /api/get/conversation/:conversationId`
- **请求头**: `Authorization: localStorage.auth`
- **响应处理**: 提取 `data.baseId` 用于知识库关联

#### 3.1.3 查询消息列表

- **前端触发点**: `fetchMessages` in `Conversation.jsx` (line 140)
- **后端接口**: `POST /api/query/messages`
- **请求载荷**:
  ```json
  {
    "conversation_id": "string"
  }
  ```
- **响应结构**:
  ```json
  {
    "current_id": "string",
    "messages": [
      {
        "message_id": "string",
        "message": {
          "author": { "role": "user" | "assistant" },
          "content": {
            "text": "string",
            "thinkText": "string" // 仅 assistant 消息，通过 split('</think>') 分离
          },
          "status": "string",
          "thinking": boolean,
          "model": "string"
        },
        "conversation_id": "string",
        "parent": "string | null",
        "children": [],
        "created_at": "string"
      }
    ]
  }
  ```
- **处理逻辑**: 通过 `processMessages` 函数构建消息链（根据 `parent` 字段）

#### 3.1.4 获取最新消息 ID

- **前端触发点**: `handleSendMessage` 流式结束后 (line 288)
- **后端接口**: `POST /api/get/latest/id`
- **请求载荷**:
  ```json
  {
    "conversation_id": "string"
  }
  ```
- **响应结构**:
  ```json
  {
    "current_id": "string"
  }
  ```

#### 3.1.5 查询对话列表

- **前端触发点**: `fetchConversations` in `Sidebar.jsx` (line 281)
- **后端接口**: `GET /api/query/conversation`
- **请求头**: `Authorization: localStorage.auth`
- **响应结构**:
  ```json
  {
    "sessions": [
      {
        "conversation_id": "string",
        "title": "string",
        "baseId": "string | null"
      }
    ]
  }
  ```

#### 3.1.6 删除对话

- **前端触发点**: `deleteConversation` in `Sidebar.jsx` (line 48)
- **后端接口**: `POST /api/delete/conversation`
- **请求载荷**:
  ```json
  {
    "conversation_id": "string"
  }
  ```

#### 3.1.7 重命名对话

- **前端触发点**: `renameConversation` in `Sidebar.jsx` (line 76)
- **后端接口**: `PUT /api/rename/conversation`
- **请求载荷**:
  ```json
  {
    "conversation_id": "string",
    "title": "string"
  }
  ```

---

### 3.2 用户认证模块 (Auth)

#### 3.2.1 用户登录

- **前端触发点**: `handleLogin` in `user/Login.jsx` (line 54)
- **后端接口**: `POST /api/login`
- **请求载荷**:
  ```json
  {
    "account": "string", // 邮箱或用户名
    "password": "string"
  }
  ```
- **响应处理**:
  - 成功时：`localStorage.loginStatus = "login"`, `localStorage.auth = data.session_id`
  - 失败时：显示错误消息

#### 3.2.2 用户注册

- **前端触发点**: `handleRegister` in `user/Register.jsx` (line 136)
- **后端接口**: `POST /api/register`
- **请求载荷**:
  ```json
  {
    "email": "string", // 必须为 @hrbeu.edu.cn 格式
    "code": "string", // 邮箱验证码
    "username": "string",
    "password": "string"
  }
  ```
- **响应处理**: 同登录，成功后设置 `localStorage` 并跳转

#### 3.2.3 发送邮箱验证码

- **前端触发点**: `handleSendEmail` in `user/Register.jsx` (line 46) 或 `ForgotPassword.jsx` (line 50)
- **后端接口**: `POST /api/send/email`
- **请求载荷**:
  ```json
  {
    "email": "string"
  }
  ```

#### 3.2.4 获取用户信息

- **前端触发点**: `fetchUsername` in `chat/utils.jsx` (line 91)
- **后端接口**: `GET /api/user/info`
- **请求头**: `Authorization: localStorage.auth`
- **响应结构**:
  ```json
  {
    "username": "string"
  }
  ```
- **错误处理**: 401 时清除 `localStorage.auth`

---

### 3.3 知识库模块 (Knowledge Base)

#### 3.3.1 获取知识库列表

- **前端触发点**: `fetchData` in `KnowBase.jsx` (line 133) 或 `HeadBar.jsx` (line 97)
- **后端接口**: `GET /api/knowledge/list`
- **请求头**: `Authorization: localStorage.auth`
- **响应结构**:
  ```json
  {
    "total": number,
    "data": [
      {
        "baseId": "string",
        "base_name": "string",
        "base_desc": "string"
      }
    ]
  }
  ```

#### 3.3.2 创建知识库

- **前端触发点**: `createKnowledge` in `KnowBase.jsx` (line 161)
- **后端接口**: `POST /api/knowledge/create`
- **请求载荷**:
  ```json
  {
    "base_name": "string",
    "base_desc": "string"
  }
  ```

#### 3.3.3 编辑知识库

- **前端触发点**: `editKnowledge` in `KnowBase.jsx` (line 210)
- **后端接口**: `PUT /api/knowledge/edit/:baseId`
- **请求载荷**:
  ```json
  {
    "base_name": "string",
    "base_desc": "string"
  }
  ```

#### 3.3.4 删除知识库

- **前端触发点**: `deleteKnowledge` in `KnowBase.jsx` (line 252)
- **后端接口**: `DELETE /api/knowledge/delete/:baseId`
- **请求头**: `Authorization: localStorage.auth`

#### 3.3.5 搜索知识库

- **前端触发点**: `searchKnowledge` in `KnowBase.jsx` (line 284)
- **后端接口**: `POST /api/knowledge/search`
- **请求载荷**:
  ```json
  {
    "base_name": "string"
  }
  ```

#### 3.3.6 获取知识库详情

- **前端触发点**: `GetBaseInfo` in `DatasetPage.jsx` (line 48) 或 `FileShowPage.jsx` (line 26)
- **后端接口**: `GET /api/knowledge/info/:baseId`
- **响应结构**:
  ```json
  {
    "data": {
      "baseId": "string",
      "base_name": "string",
      "base_desc": "string"
    }
  }
  ```

---

### 3.4 文档管理模块 (Document Management)

#### 3.4.1 获取文档列表

- **前端触发点**: `GetFileList` in `DatasetPage.jsx` (line 66)
- **后端接口**: `GET /api/knowledge/document/list`
- **查询参数 (Query Params)**:
  ```
  search: string
  baseId: string
  limit: number
  offset: number
  ```
- **响应结构**:
  ```json
  {
    "total": number,
    "data": [
      {
        "docId": "string",
        "doc_name": "string",
        "file_type": "string",
        "created_at": "string",
        "is_enabled": boolean
      }
    ]
  }
  ```

#### 3.4.2 上传文件

- **前端触发点**: `handleUpload` in `document/UploadModal.jsx` (line 13)
- **后端接口**: `POST /api/knowledge/upload/file?baseId={baseId}`
- **请求方式**: `multipart/form-data`
- **请求体**: `FormData`，字段名为 `file`
- **注意**: 支持多文件上传，前端循环调用接口逐个上传

#### 3.4.3 修改文档启用状态

- **前端触发点**: `onEnableChange` in `DatasetPage.jsx` (line 110)
- **后端接口**: `POST /api/knowledge/document/change/status`
- **请求载荷**:
  ```json
  {
    "docId": "string",
    "is_enabled": boolean
  }
  ```

#### 3.4.4 重命名文档

- **前端触发点**: `onRename` in `document/RenameModal.jsx` (line 23)
- **后端接口**: `POST /api/knowledge/document/rename`
- **请求载荷**:
  ```json
  {
    "docId": "string",
    "doc_name": "string"
  }
  ```

#### 3.4.5 删除文档

- **前端触发点**: `onDelete` in `document/DeleteModal.jsx` (line 16)
- **后端接口**: `POST /api/knowledge/delete/document`
- **请求载荷**:
  ```json
  {
    "baseId": "string",
    "docId": "string"
  }
  ```

#### 3.4.6 获取文档信息

- **前端触发点**: `GetDocName` in `FileShowPage.jsx` (line 44)
- **后端接口**: `GET /api/knowledge/document/:docId`
- **响应结构**:
  ```json
  {
    "data": "string" // 文档名称
  }
  ```

#### 3.4.7 获取文档切片详情

- **前端触发点**: `GetDocSlice` in `FileShowPage.jsx` (line 62)
- **后端接口**: `GET /api/knowledge/document/detail`
- **查询参数**:
  ```
  docId: string
  search: string
  limit: number (默认 10)
  offset: number
  ```
- **响应结构**:
  ```json
  {
    "total": number,
    "data": [
      {
        "chunk_id": "string",
        "content": "string"
      }
    ]
  }
  ```

---

### 3.5 用户设置模块 (User Settings)

#### 3.5.1 修改用户名

- **前端触发点**: `handleUpdateUsername` in `user/Setting.jsx` (line 11)
- **后端接口**: `POST /api/change/username`
- **请求载荷**:
  ```json
  {
    "username": "string"
  }
  ```

#### 3.5.2 修改邮箱

- **前端触发点**: `handleUpdateEmail` in `user/Setting.jsx` (line 32)
- **后端接口**: `POST /api/change/email`
- **请求载荷**:
  ```json
  {
    "email": "string"
  }
  ```

#### 3.5.3 删除所有聊天记录

- **前端触发点**: `handleClearChat` in `user/Setting.jsx` (line 52)
- **后端接口**: `POST /api/delete/chat`
- **请求载荷**: `{}` (空对象)

#### 3.5.4 注销账号

- **前端触发点**: `handleDeleteAccount` in `user/Setting.jsx` (line 73)
- **后端接口**: `POST /api/delete/account`
- **请求载荷**: `{}` (空对象)

---

### 3.6 密码重置模块 (Password Reset)

#### 3.6.1 验证验证码

- **前端触发点**: `verifyCode` in `user/ForgotPassword.jsx` (line 69)
- **后端接口**: `POST /api/checkcode`
- **请求载荷**:
  ```json
  {
    "email": "string",
    "code": "string"
  }
  ```
- **响应处理**: 成功时返回 `token`，存储到 `localStorage.token`

#### 3.6.2 重置密码

- **前端触发点**: `resetPassword` in `user/ForgotPassword.jsx` (line 95)
- **后端接口**: `POST /api/reset/password`
- **请求载荷**:
  ```json
  {
    "token": "string", // 从 localStorage.token 获取
    "newPassword": "string"
  }
  ```

---

## 4. 关键数据结构 (Key Frontend Models)

### 4.1 消息对象 (Message Object)

前端维护的消息对象结构（定义在 `chat/utils.jsx`）：

```typescript
interface Message {
  message: {
    author: {
      role: "user" | "assistant"
    },
    content: {
      content_type: "text",
      text: string,           // 用户消息或 AI 回答文本
      thinkText?: string       // 仅 assistant 消息，思考过程文本
    },
    status: "finished_successfully" | "processing" | string,
    thinking?: boolean,        // 是否正在思考（仅 assistant）
    model?: string,           // 模型名称（仅 assistant）
    thinkTitle?: string        // 思考标题（仅 assistant）
  },
  message_id: string,         // UUID
  conversation_id: string,
  parent: string | null,      // 父消息 ID，用于构建消息链
  children: [],
  created_at: string          // ISO 8601 时间戳
}
```

**创建函数**:
- `createUserMessage(inputText, messages, conversationId)`: 创建用户消息
- `createAIMessage(userMessage, selectedCode, models)`: 创建 AI 占位消息

### 4.2 对话对象 (Conversation Object)

```typescript
interface Conversation {
  conversation_id: string,
  title: string,
  baseId: string | null      // 关联的知识库 ID
}
```

### 4.3 知识库对象 (Knowledge Base Object)

```typescript
interface KnowledgeBase {
  baseId: string,
  base_name: string,
  base_desc: string
}
```

### 4.4 文档对象 (Document Object)

```typescript
interface Document {
  docId: string,
  doc_name: string,
  file_type: string,
  created_at: string,
  is_enabled: boolean
}
```

---

## 5. 鉴权与状态管理 (Auth & State)

### 5.1 Token 存储

- **存储位置**: `localStorage`
- **存储字段**:
  - `localStorage.auth`: 存储 Session ID / Token（用于 API 请求）
  - `localStorage.loginStatus`: 存储登录状态（值为 `"login"`）
  - `localStorage.token`: 临时存储密码重置 Token（仅用于忘记密码流程）

### 5.2 请求头携带凭证

所有需要鉴权的 API 请求在 `headers` 中携带：

```javascript
headers: {
  "Authorization": localStorage.auth,
  "Content-Type": "application/json"
}
```

**注意**: 
- 部分接口（如文件上传）使用 `multipart/form-data`，此时不设置 `Content-Type`，由浏览器自动设置
- 使用 `axios` 的接口同样在 `headers` 中设置 `Authorization: localStorage.auth`

### 5.3 鉴权检查逻辑

前端在以下场景进行鉴权检查：

1. **发送消息前** (`Conversation.jsx` line 258):
   ```javascript
   if (!localStorage.getItem("auth") || localStorage.getItem("loginStatus") !== "login") {
     toastIfLogin(0, 500);
     return;
   }
   ```

2. **401 响应处理**: 当后端返回 401 状态码时，前端会：
   - 清除 `localStorage.auth`
   - 显示错误提示
   - 可能跳转到 `/login` 页面

### 5.4 状态管理

前端使用 **React Hooks** 进行状态管理：
- `useState`: 组件内部状态
- `useEffect`: 副作用处理（数据获取、订阅等）
- `useRef`: 存储可变值（如 `baseIdRef`, `abortController`）
- **无全局状态管理库**（如 Redux、Zustand），所有状态通过 Props 和 Context 传递

---

## 6. 流式响应处理详解 (SSE Processing)

### 6.1 SSE 处理流程

前端使用 `eventsource-parser` 库处理 SSE 流式响应，核心逻辑在 `chat/utils.jsx` 的 `processSSE` 函数中：

```javascript
// 1. 创建流式读取器
const reader = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new EventSourceParserStream())
  .getReader();

// 2. 循环读取事件
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // 3. 解析 JSON 数据
  const jsonData = JSON.parse(value.data);
  
  // 4. 根据事件类型处理
  if (jsonData.type === "answer_chunk") {
    // 处理内容块
  } else if (jsonData.type === "status") {
    // 处理状态更新
  } else if (jsonData.type === "error") {
    // 处理错误
  }
}
```

### 6.2 SSE 事件类型

| 事件类型 | 说明 | 数据结构 |
| --- | --- | --- |
| `answer_chunk` | 内容块 | `{ type: "answer_chunk", content: string }` |
| `status` | 状态更新 | `{ type: "status", message: string }` |
| `error` | 错误信息 | `{ type: "error", message: string }` |

### 6.3 特殊标记

- `</think>`: 用于分隔思考文本（`thinkText`）和回答文本（`text`）
- `"ANSWER_DONE"`: 状态消息，表示流式响应完成

### 6.4 中断处理

前端支持用户中断 SSE 流：
- 使用 `AbortController` 控制请求中断
- 点击停止按钮时调用 `abortController.current?.abort()`

---

## 7. 错误处理机制

### 7.1 网络错误

- 使用 `try-catch` 捕获异常
- 通过 `react-toastify` 或 `antd` 的 `message` API 显示错误提示

### 7.2 401 未授权

统一处理逻辑：
```javascript
if (response.status === 401) {
  localStorage.removeItem("auth");
  // 显示错误提示
  // 可能跳转到登录页
}
```

### 7.3 表单验证

- 前端进行基础验证（如邮箱格式、必填项检查）
- 邮箱格式验证：必须为 `@hrbeu.edu.cn` 结尾

---

## 8. 注意事项

1. **SSE 流式响应**: 后端必须返回 `Content-Type: text/event-stream`，事件格式遵循 SSE 规范
2. **消息链构建**: 前端通过 `parent` 字段构建消息树，后端需确保 `parent` 字段正确
3. **Token 格式**: `localStorage.auth` 存储的 Token 直接作为 `Authorization` 头值，无需添加 `Bearer` 前缀
4. **文件上传**: 使用 `FormData`，字段名为 `file`，支持多文件但需逐个上传
5. **分页参数**: 文档列表使用 `limit` 和 `offset` 进行分页，非 `page` 和 `pageSize`
6. **时间格式**: 所有时间字段使用 ISO 8601 格式（如 `2024-01-01T00:00:00.000Z`）

---

## 附录：API 端点汇总表

| 模块 | 方法 | 端点 | 鉴权 |
| --- | --- | --- | --- |
| 对话 | POST | `/api/new/message` | ✅ |
| 对话 | GET | `/api/get/conversation/:id` | ✅ |
| 对话 | POST | `/api/query/messages` | ✅ |
| 对话 | POST | `/api/get/latest/id` | ✅ |
| 对话 | GET | `/api/query/conversation` | ✅ |
| 对话 | POST | `/api/delete/conversation` | ✅ |
| 对话 | PUT | `/api/rename/conversation` | ✅ |
| 认证 | POST | `/api/login` | ❌ |
| 认证 | POST | `/api/register` | ❌ |
| 认证 | POST | `/api/send/email` | ❌ |
| 认证 | GET | `/api/user/info` | ✅ |
| 知识库 | GET | `/api/knowledge/list` | ✅ |
| 知识库 | POST | `/api/knowledge/create` | ✅ |
| 知识库 | PUT | `/api/knowledge/edit/:baseId` | ✅ |
| 知识库 | DELETE | `/api/knowledge/delete/:baseId` | ✅ |
| 知识库 | POST | `/api/knowledge/search` | ✅ |
| 知识库 | GET | `/api/knowledge/info/:baseId` | ✅ |
| 文档 | GET | `/api/knowledge/document/list` | ✅ |
| 文档 | POST | `/api/knowledge/upload/file` | ✅ |
| 文档 | POST | `/api/knowledge/document/change/status` | ✅ |
| 文档 | POST | `/api/knowledge/document/rename` | ✅ |
| 文档 | POST | `/api/knowledge/delete/document` | ✅ |
| 文档 | GET | `/api/knowledge/document/:docId` | ✅ |
| 文档 | GET | `/api/knowledge/document/detail` | ✅ |
| 设置 | POST | `/api/change/username` | ✅ |
| 设置 | POST | `/api/change/email` | ✅ |
| 设置 | POST | `/api/delete/chat` | ✅ |
| 设置 | POST | `/api/delete/account` | ✅ |
| 密码 | POST | `/api/checkcode` | ❌ |
| 密码 | POST | `/api/reset/password` | ❌ |

---

**文档版本**: 1.0  
**最后更新**: 2024  
**维护者**: 前端开发团队

