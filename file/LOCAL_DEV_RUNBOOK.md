# 本地开发与部署手册 (Local Dev Runbook)

## 1. 端口与依赖服务

### 1.1 Java 后端
- 默认端口：`8081`（见 `src/main/resources/application.yml`）

### 1.2 Docker Compose 依赖（`docker-compose.yml`）
- PostgreSQL：`5433 -> 5432`
- MongoDB：`27017`
- Redis：`6379`（compose 内启用密码：`redis_password`）
- Milvus：`19530`（依赖 etcd `2379` + MinIO `9000/9001`）

### 1.3 Ollama（本地安装）
- base-url：`http://localhost:11434`
- 模型：`qwen2.5:7b`（chat + embedding）

---

## 2. 一键启动（推荐）

### 2.1 启动依赖服务

```bash
cd /root/go/src/Go_LLM_Web
docker compose up -d
```

### 2.2 准备 Ollama

```bash
ollama pull qwen2.5:7b
```

### 2.3 启动 Java 后端

```bash
cd /root/go/src/Go_LLM_Web
./mvnw spring-boot:run
```

> 如果没有 `./mvnw`，可用 `mvn spring-boot:run`（需自行安装 Maven）。

---

## 3. 配置要点（避免踩坑）

### 3.1 Milvus schema 对齐（关键）
- `application.yml` 中：
  - `spring.ai.vectorstore.milvus.id-field-name: id`
  - `spring.ai.vectorstore.milvus.metadata-field-name: metadata_json`
  - `spring.ai.vectorstore.milvus.embedding-dimension: 3584`（与 qwen2.5:7b embedding 维度一致）

### 3.2 邮箱验证码开关
- 详见 `EMAIL_VERIFICATION_TOGGLE.md`
- 后端：`email.verification.enabled`
- 前端：`frontend/src/constants.jsx`（如果启用 UI）

### 3.3 Redis 密码
- compose 对 Redis 开了密码 `redis_password`
- `application.yml` 的 `spring.data.redis.password` 需要与之对齐（否则邮件验证码会异常）

### 3.4 敏感信息
- 生产环境 **禁止** 直接在 `application.yml` 明文写 SMTP/JWT secret
- 建议全部通过环境变量注入，并提供 `.env.example`（Roadmap）

---

## 4. 常见问题排查

### 4.1 Milvus 插入报错：field is not provided / metadata_json 缺失
- 确认 `application.yml` 的 `id-field-name` / `metadata-field-name` 与 `MilvusConfig` schema 一致
- 确认写入时 metadata 非 null（`KnowledgeBaseService` 已做保护）

### 4.2 切片查询很慢 / 内存占用高
- 现状是 `topK(10000)` 拉全量后过滤（见 `DocumentService.getDocumentChunks`）
- 优化方案见 `MILVUS_OPTIMIZATION_NOTES.md`

### 4.3 SSE 前端收不到数据
- 确认后端返回 `Content-Type: text/event-stream`
- 确认代理/网关未缓冲 SSE（本地直连一般没问题）


