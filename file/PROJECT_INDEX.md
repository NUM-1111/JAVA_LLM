# 项目文档索引 (Project Docs Index)

> 目标：把项目文档变成“可直接驱动开发”的规格说明。你可以按模块把某一个 md 文件丢给 Cursor，让它围绕 TODO/验收标准去迭代代码。

---

## 1. 项目级文档

- `file/ARCHITECTURE_OVERVIEW.md`：总体架构、数据流（Write Path / Read Path）、关键设计决策
- `file/LOCAL_DEV_RUNBOOK.md`：本地启动、依赖服务、端口、常见故障排查
- `file/API_CONTRACT.md`：统一响应/鉴权/字段命名/SSE 协议（前后端对接契约）
- `file/RESUME_HIGHLIGHTS_MAPPING.md`：简历亮点 → 代码落点 / 可量化点 / Roadmap（避免“过度包装”）

## 2. 分模块文档（开发驱动）

- `file/auth_module.md`：认证与账号安全
- `file/chat_module.md`：对话与 RAG 问答
- `file/knowledge_base_module.md`：知识库管理
- `file/document_module.md`：文档上传、解析、切片、向量化与管理
- `file/user_settings_module.md`：用户设置与账号管理

## 3. 现有专项说明（已沉淀）

- `EMAIL_VERIFICATION_TOGGLE.md`：邮箱验证码开关（前后端同步）
- `MILVUS_OPTIMIZATION_NOTES.md`：Milvus 删除/切片查询性能问题与方案
- `API.md`：API 文档（可作为对外说明，但以 `file/API_CONTRACT.md` 为“契约真相源”）


