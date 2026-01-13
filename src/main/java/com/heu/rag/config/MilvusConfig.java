package com.heu.rag.config;

import io.milvus.client.MilvusServiceClient;
import io.milvus.grpc.DataType;
import io.milvus.param.ConnectParam;
import io.milvus.param.IndexType;
import io.milvus.param.MetricType;
import io.milvus.param.R;
import io.milvus.param.collection.CreateCollectionParam;
import io.milvus.param.collection.DescribeCollectionParam;
import io.milvus.param.collection.DropCollectionParam;
import io.milvus.param.collection.FieldType;
import io.milvus.param.collection.HasCollectionParam;
import io.milvus.param.index.CreateIndexParam;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.util.ArrayList;
import java.util.List;

/**
 * Milvus Configuration
 * Ensures the vector_store collection is created on application startup
 */
@Configuration
@Slf4j
@Order(1) // Run early to ensure collection exists before VectorStore is used
public class MilvusConfig implements CommandLineRunner {

    @Value("${spring.ai.vectorstore.milvus.client.host:localhost}")
    private String milvusHost;

    @Value("${spring.ai.vectorstore.milvus.client.port:19530}")
    private int milvusPort;

    @Value("${spring.ai.vectorstore.milvus.embedding-dimension:4096}")
    private int embeddingDimension;

    private static final String COLLECTION_NAME = "vector_store";
    private static final String ID_FIELD = "id";
    private static final String CONTENT_FIELD = "content";
    private static final String VECTOR_FIELD = "embedding";
    private static final String METADATA_FIELD = "metadata_json";

    @Override
    public void run(String... args) {
        log.info("Initializing Milvus collection '{}'...", COLLECTION_NAME);

        MilvusServiceClient client = null;
        try {
            // Create Milvus client
            client = new MilvusServiceClient(
                    ConnectParam.newBuilder()
                            .withHost(milvusHost)
                            .withPort(milvusPort)
                            .build());

            // Ensure collection exists
            ensureCollectionExists(client);

            log.info("Milvus collection '{}' is ready", COLLECTION_NAME);
        } catch (Exception e) {
            log.error("Failed to initialize Milvus collection", e);
            throw new RuntimeException("Failed to initialize Milvus collection", e);
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
     * Ensure the vector_store collection exists, create if not
     * Also validates and rebuilds collection if embedding dimension mismatch
     */
    private void ensureCollectionExists(MilvusServiceClient client) {
        try {
            // Check if collection exists
            R<Boolean> hasCollection = client.hasCollection(
                    HasCollectionParam.newBuilder()
                            .withCollectionName(COLLECTION_NAME)
                            .build());

            if (hasCollection.getData() != null && hasCollection.getData()) {
                log.info("Collection '{}' already exists, validating dimension...", COLLECTION_NAME);

                // Validate embedding dimension matches configuration
                if (!validateCollectionDimension(client)) {
                    log.warn("Collection '{}' has mismatched embedding dimension. Dropping and recreating...",
                            COLLECTION_NAME);
                    dropCollection(client);
                    // Continue to create new collection below
                } else {
                    log.info("Collection '{}' dimension validation passed (dim={})", COLLECTION_NAME,
                            embeddingDimension);
                    return;
                }
            }

            log.info("Collection '{}' does not exist or was dropped, creating with dimension {}...", COLLECTION_NAME,
                    embeddingDimension);

            // Define field types
            List<FieldType> fields = new ArrayList<>();

            // ID field (VARCHAR)
            fields.add(FieldType.newBuilder()
                    .withName(ID_FIELD)
                    .withDataType(DataType.VarChar)
                    .withMaxLength(65535)
                    .withPrimaryKey(true)
                    .withAutoID(false)
                    .build());

            // Content field (VARCHAR)
            fields.add(FieldType.newBuilder()
                    .withName(CONTENT_FIELD)
                    .withDataType(DataType.VarChar)
                    .withMaxLength(65535)
                    .build());

            // Vector field (FLOAT_VECTOR)
            fields.add(FieldType.newBuilder()
                    .withName(VECTOR_FIELD)
                    .withDataType(DataType.FloatVector)
                    .withDimension(embeddingDimension)
                    .build());

            // Metadata field (JSON)
            fields.add(FieldType.newBuilder()
                    .withName(METADATA_FIELD)
                    .withDataType(DataType.JSON)
                    .build());

            // Create collection
            CreateCollectionParam createParam = CreateCollectionParam.newBuilder()
                    .withCollectionName(COLLECTION_NAME)
                    .withFieldTypes(fields)
                    .withDescription("Vector store for RAG documents")
                    .build();

            R<?> createResult = client.createCollection(createParam);

            if (createResult.getStatus() == R.Status.Success.getCode()) {
                log.info("Successfully created collection '{}'", COLLECTION_NAME);

                // Create index on vector field for similarity search
                createIndex(client);
            } else {
                log.error("Failed to create collection '{}': {}", COLLECTION_NAME, createResult.getMessage());
                throw new RuntimeException("Failed to create Milvus collection: " + createResult.getMessage());
            }

        } catch (Exception e) {
            log.error("Error ensuring collection exists", e);
            throw new RuntimeException("Failed to initialize Milvus collection", e);
        }
    }

    /**
     * Validate that existing collection's embedding dimension matches configuration
     * 
     * @return true if dimension matches, false otherwise
     */
    private boolean validateCollectionDimension(MilvusServiceClient client) {
        try {
            R<?> describeResult = client.describeCollection(
                    DescribeCollectionParam.newBuilder()
                            .withCollectionName(COLLECTION_NAME)
                            .build());

            if (describeResult.getStatus() != R.Status.Success.getCode()) {
                log.error("Failed to describe collection '{}': {}", COLLECTION_NAME, describeResult.getMessage());
                return false;
            }

            // Get the response data and extract fields
            Object data = describeResult.getData();
            if (data == null) {
                log.error("Describe collection returned null data");
                return false;
            }

            // Use reflection or type casting to get fields
            // For Milvus Java SDK, we need to check the actual response type
            try {
                // Try to get fields using reflection or known API
                java.lang.reflect.Method getFieldsMethod = data.getClass().getMethod("getFields");
                @SuppressWarnings("unchecked")
                List<FieldType> fields = (List<FieldType>) getFieldsMethod.invoke(data);

                if (fields == null || fields.isEmpty()) {
                    log.warn("Collection '{}' has no fields", COLLECTION_NAME);
                    return false;
                }

                // Find the embedding field and check its dimension
                for (FieldType field : fields) {
                    if (VECTOR_FIELD.equals(field.getName()) && field.getDataType() == DataType.FloatVector) {
                        int actualDimension = field.getDimension();
                        log.info("Collection '{}' embedding field dimension: {} (configured: {})",
                                COLLECTION_NAME, actualDimension, embeddingDimension);

                        if (actualDimension != embeddingDimension) {
                            log.error("Dimension mismatch! Collection has dim={}, but configuration requires dim={}. " +
                                    "This will cause insertion failures. Collection needs to be recreated.",
                                    actualDimension, embeddingDimension);
                            return false;
                        }
                        return true;
                    }
                }

                log.warn("Could not find embedding field '{}' in collection schema", VECTOR_FIELD);
                return false;
            } catch (Exception e) {
                log.warn("Could not extract fields from collection description, assuming dimension mismatch", e);
                // If we can't validate, it's safer to assume mismatch and recreate
                return false;
            }
        } catch (Exception e) {
            log.error("Error validating collection dimension", e);
            return false;
        }
    }

    /**
     * Drop the collection (use with caution - this deletes all data)
     */
    private void dropCollection(MilvusServiceClient client) {
        try {
            log.warn("Dropping collection '{}' to recreate with correct dimension...", COLLECTION_NAME);
            R<?> dropResult = client.dropCollection(
                    DropCollectionParam.newBuilder()
                            .withCollectionName(COLLECTION_NAME)
                            .build());

            if (dropResult.getStatus() == R.Status.Success.getCode()) {
                log.info("Successfully dropped collection '{}'", COLLECTION_NAME);
            } else {
                log.error("Failed to drop collection '{}': {}", COLLECTION_NAME, dropResult.getMessage());
                throw new RuntimeException("Failed to drop collection: " + dropResult.getMessage());
            }
        } catch (Exception e) {
            log.error("Error dropping collection", e);
            throw new RuntimeException("Failed to drop collection", e);
        }
    }

    /**
     * Create index on vector field for efficient similarity search
     */
    private void createIndex(MilvusServiceClient client) {
        try {
            CreateIndexParam indexParam = CreateIndexParam.newBuilder()
                    .withCollectionName(COLLECTION_NAME)
                    .withFieldName(VECTOR_FIELD)
                    .withIndexType(IndexType.IVF_FLAT)
                    .withMetricType(MetricType.COSINE)
                    .withExtraParam("{\"nlist\":1024}")
                    .withSyncMode(Boolean.FALSE)
                    .build();

            R<?> indexResult = client.createIndex(indexParam);

            if (indexResult.getStatus() == R.Status.Success.getCode()) {
                log.info("Successfully created index on vector field");
            } else {
                log.warn("Failed to create index: {}", indexResult.getMessage());
            }
        } catch (Exception e) {
            log.warn("Error creating index, continuing without index", e);
        }
    }
}
