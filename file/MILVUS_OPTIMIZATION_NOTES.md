# Milvus 优化说明 (Milvus Optimization Notes)

## 概述

本文档说明文档管理模块中关于 Milvus 数据删除和文档切片查询性能的当前状态和优化建议。

## 当前状态

### 1. Milvus 数据删除功能

**状态**: ⚠️ **未实现**

**当前实现**:
- `DocumentService.deleteDocument()` 方法只删除 PostgreSQL 中的文档记录
- Milvus 中的向量数据未被删除，成为孤立数据

**原因**:
- Spring AI 的 `VectorStore` 接口不提供删除方法
- Spring AI 的 `VectorStore` 接口不支持基于 metadata 的过滤删除

**影响**:
- Milvus 中的向量数据会累积，占用存储空间
- 删除的文档对应的向量数据仍然存在，可能影响查询性能

### 2. 文档切片查询性能

**状态**: ⚠️ **性能不佳**

**当前实现**:
- `DocumentService.getDocumentChunks()` 使用 `vectorStore.similaritySearch()` 查询所有向量
- 然后在内存中根据 `docId` metadata 过滤
- 查询 `topK(10000)` 然后在内存中过滤

**问题**:
- 需要查询所有向量，然后过滤，性能较差
- 对于大量文档，查询所有向量会消耗大量内存和CPU

**原因**:
- Spring AI 的 `SearchRequest` 可能不支持 `filterExpression` 进行 metadata 过滤
- 当前只能通过相似性搜索，无法直接通过 metadata 过滤

## 优化方案

### 方案 1: 使用 Milvus Java 客户端直接操作 (推荐)

#### 1.1 添加依赖

在 `pom.xml` 中添加 Milvus Java 客户端依赖：

```xml
<!-- Milvus Java Client -->
<dependency>
    <groupId>io.milvus</groupId>
    <artifactId>milvus-sdk-java</artifactId>
    <version>2.3.4</version>
</dependency>
```

#### 1.2 创建 MilvusService

创建 `src/main/java/com/heu/rag/core/service/MilvusService.java`:

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class MilvusService {
    
    private final MilvusServiceClient milvusClient;
    private final String collectionName; // 从配置读取
    
    /**
     * 查询文档的所有切片（使用 Query API，支持 metadata 过滤）
     */
    public List<Document> queryChunksByDocId(Long docId, int limit, int offset) {
        // 使用 Query API，通过 metadata 过滤
        QueryParam queryParam = QueryParam.newBuilder()
            .withCollectionName(collectionName)
            .withExpr("docId == \"" + docId + "\"")
            .withOutFields(Arrays.asList("id", "content"))
            .withLimit(limit)
            .withOffset(offset)
            .build();
        
        R<QueryResults> queryResults = milvusClient.query(queryParam);
        // 转换结果...
    }
    
    /**
     * 删除文档的所有向量数据
     */
    public void deleteChunksByDocId(Long docId) {
        DeleteParam deleteParam = DeleteParam.newBuilder()
            .withCollectionName(collectionName)
            .withExpr("docId == \"" + docId + "\"")
            .build();
        
        R<MutationResult> deleteResult = milvusClient.delete(deleteParam);
        // 处理结果...
    }
}
```

#### 1.3 配置 Milvus 连接

在 `application.yml` 中添加 Milvus 连接配置（如果还没有）：

```yaml
milvus:
  host: localhost
  port: 19530
  collection-name: default_collection # 根据实际配置
```

#### 1.4 集成到 DocumentService

在 `DocumentService` 中使用 `MilvusService`:

```java
private final MilvusService milvusService;

public void deleteDocument(Long baseId, Long docId, Long userId) {
    // ... 验证和删除文档记录 ...
    
    // 删除 Milvus 中的向量数据
    milvusService.deleteChunksByDocId(docId);
}

public List<Document> getDocumentChunks(Long docId, String search, int limit, int offset, Long userId) {
    // 使用 MilvusService 查询，支持 metadata 过滤
    List<Document> chunks = milvusService.queryChunksByDocId(docId, limit, offset);
    // ... 内容搜索过滤 ...
}
```

### 方案 2: 使用 Spring AI 的 filterExpression (如果支持)

如果 Spring AI 的 `SearchRequest` 支持 `filterExpression`，可以尝试：

```java
SearchRequest searchRequest = SearchRequest.builder()
    .query("")
    .filterExpression("docId == \"" + docId + "\"") // 如果支持
    .topK(limit)
    .build();
```

**注意**: 需要验证 Spring AI 版本是否支持此功能。

### 方案 3: 延迟实现（当前状态）

**适用场景**:
- 数据量较小
- 删除操作不频繁
- 可以接受向量数据积累

**实施**:
- 保持当前实现
- 添加 TODO 注释说明限制
- 定期手动清理 Milvus 中的孤立数据

## 推荐实施步骤

1. **短期（可选）**:
   - 保持当前实现
   - 添加日志和监控，跟踪 Milvus 数据增长
   - 定期评估是否需要优化

2. **中期（推荐）**:
   - 实施方案 1（使用 Milvus Java 客户端）
   - 实现删除功能
   - 优化查询性能

3. **长期（可选）**:
   - 考虑使用 Spring AI 的新版本（如果支持 metadata 过滤）
   - 优化索引策略
   - 实施数据压缩策略

## 注意事项

1. **Milvus 配置一致性**:
   - 确保 MilvusService 使用的连接配置与 Spring AI 一致
   - 确保 collection name 正确

2. **性能考虑**:
   - 使用 Query API 替代 similaritySearch 可以显著提升性能
   - 删除操作后可以考虑执行 compaction

3. **错误处理**:
   - 处理 Milvus 连接失败的情况
   - 处理删除失败的情况（不影响数据库删除）

4. **测试**:
   - 测试删除功能是否正常工作
   - 测试查询性能是否改善
   - 测试大数据量下的性能

## 参考资源

- [Milvus Java SDK 文档](https://milvus.io/docs/install-java.md)
- [Milvus Query API](https://milvus.io/docs/query.md)
- [Milvus Delete API](https://milvus.io/docs/delete.md)
- [Spring AI VectorStore 文档](https://docs.spring.io/spring-ai/reference/api/vectordbs.html)

---

**最后更新**: 2024  
**维护者**: Java 后端开发团队

