# 项目文档索引 (Project Docs Index)

> 目标：把项目文档变成“可直接驱动开发”的规格说明。你可以按模块把某一个 md 文件丢给 Cursor，让它围绕 TODO/验收标准去迭代代码。

---

## 1. 项目级文档（overview/）

- `file/overview/ARCHITECTURE_OVERVIEW.md`：总体架构、数据流（Write Path / Read Path）、关键设计决策、已实现功能状态
- `file/overview/PROJECT_DETAILED_DESCRIPTION.md`：**项目详细技术描述**，供功能性AI分析使用（技术栈、业务流程、数据模型、API清单等）
- `file/overview/modules_overview.md`：模块开发总览，汇总所有模块的开发状态和优先级

## 2. API 文档（api/）

- `file/api/API_CONTRACT.md`：统一响应/鉴权/字段命名/SSE 协议（前后端对接契约）

## 3. 分模块文档（modules/）

- `file/modules/auth_module.md`：认证与账号安全
- `file/modules/chat_module.md`：对话与 RAG 问答
- `file/modules/knowledge_base_module.md`：知识库管理
- `file/modules/document_module.md`：文档上传、解析、切片、向量化与管理
- `file/modules/user_settings_module.md`：用户设置与账号管理

## 4. Milvus 相关文档（milvus/）

- `file/milvus/MILVUS_IMPLEMENTATION_STATUS.md`：Milvus 功能实现状态检查报告
- `file/milvus/MILVUS_OPTIMIZATION_NOTES.md`：Milvus 优化说明（历史问题和解决方案）

## 5. 开发运维文档（dev/）

- `file/dev/LOCAL_DEV_RUNBOOK.md`：本地启动、依赖服务、端口、常见故障排查

## 6. 简历相关文档（resume/）

- `file/resume/RESUME_HIGHLIGHTS_MAPPING.md`：简历亮点 → 代码落点 / 可量化点 / Roadmap（避免"过度包装"）

## 7. 其他专项说明（项目根目录）

- `EMAIL_VERIFICATION_TOGGLE.md`：邮箱验证码开关（前后端同步）
- `API.md`：API 文档（可作为对外说明，但以 `file/api/API_CONTRACT.md` 为"契约真相源"）


