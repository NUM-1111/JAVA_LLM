# 项目文档目录结构

本文档目录已按功能分类组织，方便查找和管理。

## 📁 目录结构

```
file/
├── overview/          # 项目总览文档
│   ├── PROJECT_INDEX.md                    # 文档索引（从这里开始）
│   ├── ARCHITECTURE_OVERVIEW.md            # 架构总览
│   ├── PROJECT_DETAILED_DESCRIPTION.md    # 项目详细技术描述
│   └── modules_overview.md                 # 模块开发总览
│
├── api/              # API 相关文档
│   └── API_CONTRACT.md                     # API 契约（前后端对接）
│
├── modules/          # 模块文档（开发驱动）
│   ├── auth_module.md                      # 认证与账号安全
│   ├── chat_module.md                      # 对话与 RAG 问答
│   ├── knowledge_base_module.md            # 知识库管理
│   ├── document_module.md                  # 文档管理
│   └── user_settings_module.md             # 用户设置
│
├── milvus/           # Milvus 相关文档
│   ├── MILVUS_IMPLEMENTATION_STATUS.md     # 实现状态检查报告
│   └── MILVUS_OPTIMIZATION_NOTES.md        # 优化说明（历史）
│
├── dev/              # 开发运维文档
│   └── LOCAL_DEV_RUNBOOK.md                # 本地开发手册
│
└── resume/           # 简历相关文档
    └── RESUME_HIGHLIGHTS_MAPPING.md         # 简历亮点映射
```

## 🚀 快速开始

1. **新手上路**：从 `overview/PROJECT_INDEX.md` 开始，了解文档结构
2. **开发模块**：查看 `modules/` 目录下的对应模块文档
3. **API 对接**：参考 `api/API_CONTRACT.md`
4. **本地开发**：查看 `dev/LOCAL_DEV_RUNBOOK.md`

## 📝 文档说明

- **overview/**：项目级文档，包含架构、技术描述、模块总览
- **api/**：API 契约和接口规范
- **modules/**：各功能模块的详细开发文档
- **milvus/**：Milvus 向量数据库相关的实现和优化文档
- **dev/**：开发、部署、运维相关文档
- **resume/**：简历亮点和技术亮点映射

## 🔗 相关文档

项目根目录下还有其他文档：
- `API.md`：对外 API 文档
- `EMAIL_VERIFICATION_TOGGLE.md`：邮箱验证码开关说明

---

**最后更新**: 2026-01  
**维护者**: Java 后端开发团队

