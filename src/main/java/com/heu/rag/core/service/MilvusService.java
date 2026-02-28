package com.heu.rag.core.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.milvus.client.MilvusServiceClient;
import io.milvus.common.clientenum.ConsistencyLevelEnum;
import io.milvus.param.ConnectParam;
import io.milvus.param.R;
import io.milvus.param.collection.LoadCollectionParam;
import io.milvus.param.dml.DeleteParam;
import io.milvus.param.dml.QueryParam;
import io.milvus.param.dml.SearchParam;
import io.milvus.response.QueryResultsWrapper;
import io.milvus.response.SearchResultsWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service for direct Milvus operations with metadata filtering support.
 * Provides methods for querying and deleting vectors by metadata (baseId,
 * docId).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MilvusService {

    private static final String COLLECTION_NAME = "vector_store";
    private static final String ID_FIELD = "id";
    private static final String CONTENT_FIELD = "content";
    private static final String VECTOR_FIELD = "embedding";
    private static final String METADATA_FIELD = "metadata_json";
    private static final int SEARCH_RETRY_ATTEMPTS = 3;
    private static final long RETRY_BACKOFF_MS = 500L;

    @Value("${spring.ai.vectorstore.milvus.client.host:localhost}")
    private String milvusHost;

    @Value("${spring.ai.vectorstore.milvus.client.port:19530}")
    private int milvusPort;

    private final EmbeddingModel embeddingModel;
    private final ObjectMapper objectMapper;

    /**
     * Create Milvus client instance
     */
    private MilvusServiceClient createClient() {
        return new MilvusServiceClient(
                ConnectParam.newBuilder()
                        .withHost(milvusHost)
                        .withPort(milvusPort)
                        .build());
    }

    /**
     * Search similar documents by query text with baseId filter (for RAG retrieval)
     * 
     * @param query     The query text
     * @param baseId    The knowledge base ID to filter by (required)
     * @param topK      Number of results to return
     * @param threshold Similarity threshold (0.0-1.0)
     * @return List of similar documents
     */
    public List<Document> similaritySearchWithBaseId(String query, Long baseId, int topK, double threshold) {
        log.info("Searching similar documents: query={}, baseId={}, topK={}, threshold={}",
                query, baseId, topK, threshold);

        MilvusServiceClient client = null;
        try {
            client = createClient();

            // 1. Generate embedding for query text
            // EmbeddingModel.embed() returns List<Double> or float[]
            Object embeddingResult = embeddingModel.embed(query);
            List<Float> queryVector = new ArrayList<>();

            if (embeddingResult instanceof List) {
                @SuppressWarnings("unchecked")
                List<Double> embeddingList = (List<Double>) embeddingResult;
                queryVector = new ArrayList<>(embeddingList.size());
                for (Double d : embeddingList) {
                    queryVector.add(d.floatValue());
                }
            } else if (embeddingResult instanceof float[]) {
                float[] embeddingArray = (float[]) embeddingResult;
                queryVector = new ArrayList<>(embeddingArray.length);
                for (float f : embeddingArray) {
                    queryVector.add(f);
                }
            } else {
                throw new RuntimeException("Unsupported embedding result type: " + embeddingResult.getClass());
            }

            // 2. Build filter expression: JSON path query for baseId and isEnabled in
            // metadata_json
            // Milvus JSON field query syntax: JSON_EXTRACT(metadata_json, '$.baseId') ==
            // 'baseId'
            // Only retrieve chunks from enabled documents (isEnabled == 'true')
            String filterExpr = String.format(
                    "%s[\"baseId\"] == \"%s\" && %s[\"isEnabled\"] == \"true\"",
                    METADATA_FIELD, baseId, METADATA_FIELD);

            // 3. Build search parameters
            SearchParam searchParam = SearchParam.newBuilder()
                    .withCollectionName(COLLECTION_NAME)
                    .withMetricType(io.milvus.param.MetricType.COSINE)
                    .withOutFields(Arrays.asList(ID_FIELD, CONTENT_FIELD, METADATA_FIELD))
                    .withTopK(topK)
                    .withVectors(Collections.singletonList(queryVector))
                    .withVectorFieldName(VECTOR_FIELD)
                    .withExpr(filterExpr)
                    .withConsistencyLevel(ConsistencyLevelEnum.STRONG)
                    .build();

            // 4. Execute search (auto load collection and retry if needed)
            R<?> searchResult = executeSearchWithAutoLoad(client, searchParam);

            if (searchResult.getStatus() != R.Status.Success.getCode()) {
                log.error("Milvus search failed: {}", searchResult.getMessage());
                throw new RuntimeException("Milvus search failed: " + searchResult.getMessage());
            }

            // 5. Parse results - use reflection to handle type safely
            Object searchData = searchResult.getData();
            if (searchData == null) {
                log.warn("Search returned null data");
                return new ArrayList<>();
            }

            // Get results field using reflection and create wrapper
            SearchResultsWrapper wrapper;
            try {
                java.lang.reflect.Method getResultsMethod = searchData.getClass().getMethod("getResults");
                Object results = getResultsMethod.invoke(searchData);
                // SearchResultsWrapper constructor takes SearchResultsData
                @SuppressWarnings("unchecked")
                java.lang.reflect.Constructor<SearchResultsWrapper> constructor = (java.lang.reflect.Constructor<SearchResultsWrapper>) SearchResultsWrapper.class
                        .getDeclaredConstructor(results.getClass());
                wrapper = constructor.newInstance(results);
            } catch (Exception e) {
                log.error("Failed to parse search results using reflection: {}", e.getMessage(), e);
                log.error("Search data type: {}, available methods: {}",
                        searchData.getClass().getName(),
                        Arrays.toString(searchData.getClass().getMethods()));
                // If reflection fails, we cannot construct the wrapper
                // Return empty list as fallback
                return new ArrayList<>();
            }
            List<Document> documents = new ArrayList<>();

            List<SearchResultsWrapper.IDScore> idScores = wrapper.getIDScore(0);
            for (int i = 0; i < idScores.size(); i++) {
                SearchResultsWrapper.IDScore idScore = idScores.get(i);
                float score = idScore.getScore();

                // Apply similarity threshold
                if (score < threshold) {
                    continue;
                }

                String id = idScore.getStrID();
                Object contentObj = wrapper.getFieldWrapper(CONTENT_FIELD).getFieldData().get(i);
                String content = contentObj != null ? contentObj.toString() : "";

                // Parse metadata from JSON
                Map<String, Object> metadata = new HashMap<>();
                try {
                    Object metadataObj = wrapper.getFieldWrapper(METADATA_FIELD).getFieldData().get(i);
                    if (metadataObj != null) {
                        String metadataJson = metadataObj.toString();
                        metadata = objectMapper.readValue(metadataJson, new TypeReference<Map<String, Object>>() {
                        });
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse metadata for chunk {}: {}", id, e.getMessage());
                }

                Document doc = new Document(id, content, metadata);
                documents.add(doc);
            }

            log.info("Found {} similar documents after filtering", documents.size());
            return documents;

        } catch (Exception e) {
            log.error("Error in similarity search with baseId filter", e);
            throw new RuntimeException("Failed to search similar documents", e);
        } finally {
            if (client != null) {
                try {
                    client.close();
                } catch (Exception e) {
                    log.warn("Error closing Milvus client", e);
                }
            }
        }
    }

    /**
     * Execute Milvus search with automatic collection loading and retry.
     */
    private R<?> executeSearchWithAutoLoad(MilvusServiceClient client, SearchParam searchParam) {
        ensureCollectionLoaded(client);

        Exception lastException = null;
        for (int attempt = 1; attempt <= SEARCH_RETRY_ATTEMPTS; attempt++) {
            try {
                return client.search(searchParam);
            } catch (Exception e) {
                lastException = e;
                if (!isCollectionNotLoadedError(e) || attempt == SEARCH_RETRY_ATTEMPTS) {
                    throw e;
                }

                log.warn("Milvus collection is not loaded during search (attempt {}/{}), reloading collection",
                        attempt, SEARCH_RETRY_ATTEMPTS);
                ensureCollectionLoaded(client);
                sleepBackoff(attempt);
            }
        }

        throw new RuntimeException("Milvus search failed after retries", lastException);
    }

    /**
     * Ensure target collection is loaded before search.
     */
    private void ensureCollectionLoaded(MilvusServiceClient client) {
        R<?> loadResult = client.loadCollection(
                LoadCollectionParam.newBuilder()
                        .withCollectionName(COLLECTION_NAME)
                        .build());

        if (loadResult.getStatus() != R.Status.Success.getCode()) {
            String message = loadResult.getMessage();
            if (message != null && message.toLowerCase().contains("loaded")) {
                return;
            }
            throw new RuntimeException("Failed to load Milvus collection: " + message);
        }
    }

    private boolean isCollectionNotLoadedError(Exception e) {
        if (e == null || e.getMessage() == null) {
            return false;
        }
        String message = e.getMessage().toLowerCase();
        return message.contains("collection not loaded");
    }

    private void sleepBackoff(int attempt) {
        try {
            Thread.sleep(RETRY_BACKOFF_MS * attempt);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while waiting for Milvus collection loading", interruptedException);
        }
    }

    /**
     * Query document chunks by docId with pagination (for document detail view)
     * 
     * @param docId  Document ID to filter by
     * @param limit  Maximum number of results
     * @param offset Offset for pagination
     * @return List of document chunks
     */
    public List<Document> queryChunksByDocId(Long docId, int limit, int offset) {
        log.info("Querying chunks by docId: docId={}, limit={}, offset={}", docId, limit, offset);

        MilvusServiceClient client = null;
        try {
            client = createClient();

            // Build filter expression: JSON path query for docId in metadata_json
            String filterExpr = String.format("%s[\"docId\"] == \"%s\"", METADATA_FIELD, docId);

            // Build query parameters
            QueryParam queryParam = QueryParam.newBuilder()
                    .withCollectionName(COLLECTION_NAME)
                    .withExpr(filterExpr)
                    .withOutFields(Arrays.asList(ID_FIELD, CONTENT_FIELD, METADATA_FIELD))
                    .withLimit((long) limit)
                    .withOffset((long) offset)
                    .withConsistencyLevel(ConsistencyLevelEnum.STRONG)
                    .build();

            // Execute query
            R<?> queryResult = client.query(queryParam);

            if (queryResult.getStatus() != R.Status.Success.getCode()) {
                log.error("Milvus query failed: {}", queryResult.getMessage());
                throw new RuntimeException("Milvus query failed: " + queryResult.getMessage());
            }

            // Parse results - use QueryResultsWrapper with proper type
            Object queryData = queryResult.getData();
            if (queryData == null) {
                log.warn("Query returned null data");
                return new ArrayList<>();
            }

            QueryResultsWrapper wrapper;
            try {
                // Try to find the correct constructor
                @SuppressWarnings("unchecked")
                java.lang.reflect.Constructor<QueryResultsWrapper> constructor = (java.lang.reflect.Constructor<QueryResultsWrapper>) QueryResultsWrapper.class
                        .getDeclaredConstructor(queryData.getClass());
                wrapper = constructor.newInstance(queryData);
            } catch (Exception e) {
                log.error("Failed to create QueryResultsWrapper using reflection: {}", e.getMessage(), e);
                log.error("Query data type: {}, available methods: {}",
                        queryData.getClass().getName(),
                        Arrays.toString(queryData.getClass().getMethods()));
                // If reflection fails, we cannot construct the wrapper
                // Return empty list as fallback
                return new ArrayList<>();
            }
            List<Document> documents = new ArrayList<>();

            int rowCount = wrapper.getRowRecords().size();
            for (int i = 0; i < rowCount; i++) {
                QueryResultsWrapper.RowRecord row = wrapper.getRowRecords().get(i);
                String id = row.get(ID_FIELD).toString();
                String content = row.get(CONTENT_FIELD).toString();

                // Parse metadata from JSON
                Map<String, Object> metadata = new HashMap<>();
                try {
                    Object metadataObj = row.get(METADATA_FIELD);
                    if (metadataObj != null) {
                        String metadataJson = metadataObj.toString();
                        metadata = objectMapper.readValue(metadataJson, new TypeReference<Map<String, Object>>() {
                        });
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse metadata for chunk {}: {}", id, e.getMessage());
                }

                Document doc = new Document(id, content, metadata);
                documents.add(doc);
            }

            log.info("Found {} chunks for docId {}", documents.size(), docId);
            return documents;

        } catch (Exception e) {
            log.error("Error querying chunks by docId", e);
            throw new RuntimeException("Failed to query chunks by docId", e);
        } finally {
            if (client != null) {
                try {
                    client.close();
                } catch (Exception e) {
                    log.warn("Error closing Milvus client", e);
                }
            }
        }
    }

    /**
     * Delete all chunks for a document by docId
     * 
     * @param docId Document ID to delete chunks for
     * @return Number of deleted chunks
     */
    public long deleteChunksByDocId(Long docId) {
        log.info("Deleting chunks by docId: docId={}", docId);

        MilvusServiceClient client = null;
        try {
            client = createClient();

            // Build filter expression: JSON path query for docId in metadata_json
            String filterExpr = String.format("%s[\"docId\"] == \"%s\"", METADATA_FIELD, docId);

            // Build delete parameters
            DeleteParam deleteParam = DeleteParam.newBuilder()
                    .withCollectionName(COLLECTION_NAME)
                    .withExpr(filterExpr)
                    .build();

            // Execute delete
            R<?> deleteResult = client.delete(deleteParam);

            if (deleteResult.getStatus() != R.Status.Success.getCode()) {
                log.error("Milvus delete failed: {}", deleteResult.getMessage());
                throw new RuntimeException("Milvus delete failed: " + deleteResult.getMessage());
            }

            // Extract delete count from result
            long deletedCount = 0;
            try {
                Object data = deleteResult.getData();
                if (data != null) {
                    java.lang.reflect.Method getDeleteCntMethod = data.getClass().getMethod("getDeleteCnt");
                    deletedCount = (Long) getDeleteCntMethod.invoke(data);
                }
            } catch (Exception e) {
                log.warn("Could not extract delete count from result", e);
            }
            log.info("Deleted {} chunks for docId {}", deletedCount, docId);
            return deletedCount;

        } catch (Exception e) {
            log.error("Error deleting chunks by docId", e);
            throw new RuntimeException("Failed to delete chunks by docId", e);
        } finally {
            if (client != null) {
                try {
                    client.close();
                } catch (Exception e) {
                    log.warn("Error closing Milvus client", e);
                }
            }
        }
    }

    /**
     * Count chunks for a document by docId
     * 
     * @param docId Document ID
     * @return Number of chunks
     */
    public long countChunksByDocId(Long docId) {
        log.debug("Counting chunks by docId: docId={}", docId);

        MilvusServiceClient client = null;
        try {
            client = createClient();

            // Build filter expression
            String filterExpr = String.format("%s[\"docId\"] == \"%s\"", METADATA_FIELD, docId);

            // Note: Milvus doesn't have a direct count API, so we need to query all IDs
            // For efficiency, we can use a workaround: query with a large limit
            QueryParam countParam = QueryParam.newBuilder()
                    .withCollectionName(COLLECTION_NAME)
                    .withExpr(filterExpr)
                    .withOutFields(Collections.singletonList(ID_FIELD))
                    .withLimit(10000L) // Large limit to get all
                    .withConsistencyLevel(ConsistencyLevelEnum.STRONG)
                    .build();

            R<?> countResult = client.query(countParam);
            if (countResult.getStatus() == R.Status.Success.getCode()) {
                Object countData = countResult.getData();
                if (countData != null) {
                    QueryResultsWrapper wrapper;
                    try {
                        @SuppressWarnings("unchecked")
                        java.lang.reflect.Constructor<QueryResultsWrapper> constructor = (java.lang.reflect.Constructor<QueryResultsWrapper>) QueryResultsWrapper.class
                                .getDeclaredConstructor(countData.getClass());
                        wrapper = constructor.newInstance(countData);
                    } catch (Exception e) {
                        log.error("Failed to create QueryResultsWrapper for count: {}", e.getMessage(), e);
                        log.error("Count data type: {}, available methods: {}",
                                countData.getClass().getName(),
                                Arrays.toString(countData.getClass().getMethods()));
                        // If reflection fails, we cannot construct the wrapper
                        // Return 0 as fallback
                        return 0;
                    }
                    long count = wrapper.getRowRecords().size();
                    log.debug("Found {} chunks for docId {}", count, docId);
                    return count;
                }
            }

            return 0;

        } catch (Exception e) {
            log.error("Error counting chunks by docId", e);
            return 0;
        } finally {
            if (client != null) {
                try {
                    client.close();
                } catch (Exception e) {
                    log.warn("Error closing Milvus client", e);
                }
            }
        }
    }
}
