package com.heu.rag.core.service;

import com.heu.rag.config.SnowflakeIdGenerator;
import com.heu.rag.core.domain.Document;
import com.heu.rag.core.domain.FileType;
import com.heu.rag.core.domain.ParseStatus;
import com.heu.rag.core.exception.ResourceNotFoundException;
import com.heu.rag.core.repository.DocumentRepository;
import com.heu.rag.core.repository.KnowledgeBaseRepository;
import com.heu.rag.core.util.MilvusDocumentSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.InputStreamResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for handling knowledge base document upload and processing.
 * Implements the "Write" path: File Upload -> Parsing -> Chunking ->
 * Vectorization -> Storage
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeBaseService {

    private final DocumentRepository documentRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final VectorStore vectorStore;
    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final MilvusDocumentSanitizer milvusDocumentSanitizer;

    /**
     * Upload and process a file: parse, chunk, vectorize, and store in Milvus.
     * 
     * @param file   The uploaded file
     * @param baseId The knowledge base ID
     * @param userId The user ID (for validation)
     */
    @Transactional
    public void uploadAndProcess(MultipartFile file, Long baseId, Long userId) {
        String rawFileName = file.getOriginalFilename();
        String fileName = sanitizeString(rawFileName, "unnamed-file");
        log.info("Starting file upload processing: fileName={}, baseId={}, userId={}",
                fileName, baseId, userId);

        // 1. Validation: Check if KnowledgeBase exists
        var knowledgeBase = knowledgeBaseRepository.findById(baseId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "KnowledgeBase not found with id: " + baseId));

        if (!knowledgeBase.getUserId().equals(userId)) {
            throw new IllegalArgumentException(
                    "User " + userId + " does not have access to knowledge base " + baseId);
        }

        // 2. DB Entry: Save a new Document entity with status NONE
        Long docId = snowflakeIdGenerator.nextId();
        String fileSuffix = extractFileSuffix(fileName);
        FileType fileType = determineFileType(fileSuffix);

        Document dbDocument = Document.builder()
                .docId(docId)
                .baseId(baseId)
                .docName(fileName)
                .fileSuffix(fileSuffix)
                .fileType(fileType)
                .filePath(null) // Can be set if file is saved to disk
                .isEnabled(true)
                .status(ParseStatus.None)
                .totalChunks(0)
                .build();

        dbDocument = documentRepository.save(dbDocument);
        log.info("Created document entity: docId={}", docId);

        try {
            // 3. Parsing: Use TikaDocumentReader to extract text
            log.debug("Starting document parsing...");
            TikaDocumentReader reader = new TikaDocumentReader(
                    new InputStreamResource(file.getInputStream()));
            List<org.springframework.ai.document.Document> parsedDocuments = reader.get();

            if (parsedDocuments.isEmpty()) {
                throw new IOException("No content extracted from file: " + fileName);
            }

            // Combine all parsed content
            String fullText = parsedDocuments.stream()
                    .map(doc -> {
                        // Try different methods to get content
                        try {
                            return doc.getText() != null ? doc.getText() : doc.toString();
                        } catch (Exception e) {
                            return doc.toString();
                        }
                    })
                    .filter(content -> content != null && !content.isEmpty())
                    .collect(Collectors.joining("\n\n"));

            log.info("Extracted text content: {} characters", fullText.length());

            // Check if extracted text is empty
            if (fullText == null || fullText.trim().isEmpty()) {
                String errorMsg = String.format(
                        "无法从文件中提取文本内容。文件类型: %s, 文件名: %s。图片文件或无法解析的文件类型无法进行向量化处理。",
                        fileType, fileName);
                throw new IOException(errorMsg);
            }

            // 4. Splitting: Use TokenTextSplitter to split text into chunks
            log.debug("Starting text chunking...");
            TokenTextSplitter splitter = new TokenTextSplitter();
            List<org.springframework.ai.document.Document> chunks = splitter.apply(parsedDocuments);

            log.info("Split document into {} chunks", chunks.size());

            // Check if chunks are empty after splitting
            if (chunks == null || chunks.isEmpty()) {
                String errorMsg = String.format(
                        "文件分割后没有生成有效的内容块。文件类型: %s, 文件名: %s。请确保文件包含可提取的文本内容。",
                        fileType, fileName);
                throw new IOException(errorMsg);
            }

            // Filter out empty chunks
            List<org.springframework.ai.document.Document> validChunks = chunks.stream()
                    .filter(chunk -> {
                        try {
                            String content = chunk.getText() != null ? chunk.getText() : chunk.toString();
                            return content != null && !content.trim().isEmpty();
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .collect(Collectors.toList());

            if (validChunks.isEmpty()) {
                String errorMsg = String.format(
                        "文件处理后没有生成有效的内容块。文件类型: %s, 文件名: %s。请确保文件包含可提取的文本内容。",
                        fileType, fileName);
                throw new IOException(errorMsg);
            }

            // 5. Vectorization & Storage: Convert chunks and inject metadata
            log.debug("Starting vectorization and storage...");
            List<org.springframework.ai.document.Document> chunksWithMetadata = new ArrayList<>();
            int chunkIndex = 0;
            long baseTimestamp = System.currentTimeMillis();

            for (org.springframework.ai.document.Document chunk : validChunks) {
                // Extract content
                String content = null;
                try {
                    content = chunk.getText() != null ? chunk.getText() : chunk.toString();
                } catch (Exception e) {
                    log.warn("Failed to extract text from chunk {}, using toString()", chunkIndex, e);
                    content = chunk.toString();
                }

                // Validate content is not empty
                if (content == null || content.trim().isEmpty()) {
                    log.warn("Skipping empty chunk at index {}", chunkIndex);
                    chunkIndex++;
                    continue;
                }

                // Generate unique ID for each chunk if not present
                // Format: docId_chunkIndex_timestamp
                String chunkId = chunk.getId();
                if (chunkId == null || chunkId.trim().isEmpty()) {
                    // Use baseTimestamp + chunkIndex to ensure uniqueness while maintaining order
                    chunkId = String.format("%d_%d_%d", docId, chunkIndex, baseTimestamp + chunkIndex);
                    log.debug("Generated new chunk ID: {}", chunkId);
                } else {
                    log.debug("Using existing chunk ID: {}", chunkId);
                }

                // Ensure chunkId is never null or empty
                if (chunkId == null || chunkId.trim().isEmpty()) {
                    throw new IllegalStateException(
                            String.format("Failed to generate valid ID for chunk at index %d", chunkIndex));
                }

                // Create document with metadata
                // CRITICAL: Ensure metadata is never null - Milvus requires metadata_json field
                // If chunk.getMetadata() is null, create a new HashMap to avoid "field is not provided" error
                Map<String, Object> metadata = chunk.getMetadata();
                if (metadata == null) {
                    metadata = new HashMap<>();
                    log.debug("Chunk at index {} had null metadata, creating new metadata map", chunkIndex);
                } else {
                    // Create a copy to avoid modifying the original
                    metadata = new HashMap<>(metadata);
                }

                // Inject metadata for retrieval filtering
                metadata.put("docId", docId.toString());
                metadata.put("baseId", baseId.toString());
                metadata.put("fileName", fileName);
                metadata.put("chunkIndex", String.valueOf(chunkIndex));
                metadata.put("isEnabled", String.valueOf(dbDocument.getIsEnabled())); // Add isEnabled for filtering

                // Create document with guaranteed non-null metadata
                org.springframework.ai.document.Document docWithMetadata = new org.springframework.ai.document.Document(
                        chunkId, // Ensure ID is always provided and non-empty
                        content,
                        metadata); // Metadata is guaranteed to be non-null

                chunksWithMetadata.add(docWithMetadata);
                chunkIndex++;
            }

            // Call vectorStore.add() - This automatically calls Ollama Embedding
            // Only add if we have valid chunks
            if (!chunksWithMetadata.isEmpty()) {
                try {
                    log.info("Attempting to store {} chunks in vector store (Milvus)...", chunksWithMetadata.size());

                    MilvusDocumentSanitizer.SanitizeResult sanitizeResult = milvusDocumentSanitizer.sanitize(
                            chunksWithMetadata,
                            docId,
                            baseId,
                            fileName,
                            dbDocument.getIsEnabled(),
                            baseTimestamp);
                    List<org.springframework.ai.document.Document> milvusSafeChunks = sanitizeResult.documents();
                    List<String> validationWarnings = sanitizeResult.warnings();
                    if (!validationWarnings.isEmpty()) {
                        log.warn("Milvus payload sanitizer warnings: {}", String.join(" | ", validationWarnings));
                    }

                    if (milvusSafeChunks.isEmpty()) {
                        String validationMsg = validationWarnings.isEmpty() ? "unknown validation error"
                                : String.join("; ", validationWarnings);
                        throw new IllegalStateException(
                                String.format("没有可写入Milvus的有效内容块。文档ID: %d, 文件名: %s, 详情: %s",
                                        docId, fileName, validationMsg));
                    }

                    // 在 vectorStore.add(...) 前调用
                    logMilvusPayloadProbe(milvusSafeChunks, docId, fileName);
                    List<String> payloadErrors = validateMilvusPayload(milvusSafeChunks);
                    if (!payloadErrors.isEmpty()) {
                        throw new IllegalStateException(
                                String.format("Milvus payload 校验失败，docId=%d, fileName=%s, errors=%s",
                                        docId, fileName, String.join(" | ", payloadErrors)));
                    }

                    vectorStore.add(milvusSafeChunks);
                    log.info("Successfully stored {} chunks in vector store (Milvus)", milvusSafeChunks.size());
                    chunksWithMetadata = milvusSafeChunks;
                } catch (Exception e) {
                    log.error("Failed to store chunks in Milvus vector store. Chunk count: {}, docId: {}, fileName: {}",
                            chunksWithMetadata.size(), docId, fileName, e);

                    // Check if it's a Milvus-specific error
                    String errorMsg = e.getMessage();
                    if (errorMsg != null && errorMsg.contains("id is not provided")) {
                        throw new IllegalStateException(
                                String.format("Milvus插入失败：缺少必需的ID字段。文档ID: %d, 文件名: %s。请检查ID生成逻辑。",
                                        docId, fileName),
                                e);
                    } else if (errorMsg != null && errorMsg.contains("collection")) {
                        throw new IllegalStateException(
                                String.format("Milvus集合访问失败。文档ID: %d, 文件名: %s。请检查Milvus连接和集合配置。",
                                        docId, fileName),
                                e);
                    } else if (errorMsg != null
                            && errorMsg.contains("String.length()")
                            && errorMsg.contains("is null")) {
                        throw new IllegalStateException(
                                String.format("Milvus插入失败：存在空字符串字段（如id/content/metadata中的文本值）。文档ID: %d, 文件名: %s。",
                                        docId, fileName),
                                e);
                    } else {
                        throw new RuntimeException(
                                String.format("向量存储失败。文档ID: %d, 文件名: %s, 错误: %s",
                                        docId, fileName, errorMsg != null ? errorMsg : e.getClass().getSimpleName()),
                                e);
                    }
                }
            } else {
                log.warn("No valid chunks to store in vector store for docId: {}, fileName: {}", docId, fileName);
            }

            // 6. Completion: Update DB entity status to SUCCESS
            dbDocument.setStatus(ParseStatus.Success);
            dbDocument.setTotalChunks(chunksWithMetadata.size());
            documentRepository.save(dbDocument);

            log.info("Successfully processed document: docId={}, totalChunks={}",
                    docId, chunksWithMetadata.size());

        } catch (Exception e) {
            // 7. Error Handling: Update status to FAILURE and throw exception
            log.error("Error processing document: docId={}", docId, e);
            dbDocument.setStatus(ParseStatus.Failure);
            documentRepository.save(dbDocument);
            throw new RuntimeException("Failed to process document: " + fileName, e);
        }
    }

    /**
     * Extract file suffix from filename.
     */
    private String extractFileSuffix(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
    }

    private String sanitizeString(String value, String defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? defaultValue : trimmed;
    }

    /**
     * Determine FileType enum from file suffix.
     */
    private FileType determineFileType(String suffix) {
        return switch (suffix.toLowerCase()) {
            case "doc", "docx" -> FileType.Word;
            case "xls", "xlsx" -> FileType.Excel;
            case "ppt", "pptx" -> FileType.PPT;
            case "pdf" -> FileType.PDF;
            case "txt" -> FileType.TXT;
            case "md", "markdown" -> FileType.Markdown;
            case "jpg", "jpeg", "png", "gif", "bmp" -> FileType.Image;
            default -> FileType.Other;
        };
    }

    // ====== Payload Probe Helpers ======

    private void logMilvusPayloadProbe(List<org.springframework.ai.document.Document> docs, Long docId,
            String fileName) {
        if (!log.isInfoEnabled()) {
            return;
        }

        log.info("Milvus payload probe start: docId={}, fileName={}, chunkCount={}",
                docId, fileName, docs == null ? 0 : docs.size());

        if (docs == null) {
            log.warn("Milvus payload docs is null");
            return;
        }

        for (int i = 0; i < docs.size(); i++) {
            org.springframework.ai.document.Document d = docs.get(i);
            if (d == null) {
                log.warn("payload[{}]: document is null", i);
                continue;
            }

            String id = d.getId();
            String content = d.getText();
            Map<String, Object> metadata = d.getMetadata();

            boolean idNull = id == null;
            boolean contentNull = content == null;
            boolean metadataNull = metadata == null;

            int contentLen = contentNull ? -1 : content.length();
            int metadataSize = metadataNull ? -1 : metadata.size();

            log.info(
                    "payload[{}]: idNull={}, contentNull={}, metadataNull={}, contentLen={}, metadataSize={}, idPreview={}",
                    i, idNull, contentNull, metadataNull, contentLen, metadataSize, safePreview(id, 64));

            if (!metadataNull) {
                for (Map.Entry<String, Object> entry : metadata.entrySet()) {
                    String key = entry.getKey();
                    Object value = entry.getValue();
                    if (key == null) {
                        log.warn("payload[{}].metadata has null key", i);
                    }
                    if (value == null) {
                        log.warn("payload[{}].metadata[{}] is null", i, key);
                    } else if (value instanceof String s && s.trim().isEmpty()) {
                        log.debug("payload[{}].metadata[{}] is blank string", i, key);
                    }
                }
            }
        }

        log.info("Milvus payload probe end: docId={}, fileName={}", docId, fileName);
    }

    private List<String> validateMilvusPayload(List<org.springframework.ai.document.Document> docs) {
        List<String> errors = new ArrayList<>();
        if (docs == null) {
            errors.add("payload list is null");
            return errors;
        }

        for (int i = 0; i < docs.size(); i++) {
            org.springframework.ai.document.Document d = docs.get(i);
            if (d == null) {
                errors.add(String.format("payload[%d] document is null", i));
                continue;
            }

            if (d.getId() == null || d.getId().trim().isEmpty()) {
                errors.add(String.format("payload[%d].id is null/blank", i));
            }

            if (d.getText() == null || d.getText().trim().isEmpty()) {
                errors.add(String.format("payload[%d].content is null/blank", i));
            }

            Map<String, Object> metadata = d.getMetadata();
            if (metadata == null) {
                errors.add(String.format("payload[%d].metadata is null", i));
                continue;
            }
            List<String> nestedNullPaths = findNestedNullPaths(metadata, String.format("payload[%d].metadata", i));
            errors.addAll(nestedNullPaths);
        }

        return errors;
    }

    private List<String> findNestedNullPaths(Object value, String path) {
        List<String> errors = new ArrayList<>();
        if (value == null) {
            errors.add(path + " is null");
            return errors;
        }

        if (value instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                Object key = entry.getKey();
                String nextPath = path + "." + String.valueOf(key);
                if (key == null) {
                    errors.add(path + " has null key");
                    continue;
                }
                errors.addAll(findNestedNullPaths(entry.getValue(), nextPath));
            }
            return errors;
        }

        if (value instanceof Iterable<?> iterable) {
            int index = 0;
            for (Object item : iterable) {
                errors.addAll(findNestedNullPaths(item, String.format("%s[%d]", path, index)));
                index++;
            }
            return errors;
        }

        if (value.getClass().isArray()) {
            int len = Array.getLength(value);
            for (int i = 0; i < len; i++) {
                Object item = Array.get(value, i);
                errors.addAll(findNestedNullPaths(item, String.format("%s[%d]", path, i)));
            }
        }

        return errors;
    }

    private String safePreview(String value, int maxLen) {
        if (value == null) {
            return "<null>";
        }
        String v = value.replaceAll("\\s+", " ").trim();
        if (v.length() <= maxLen) {
            return v;
        }
        return v.substring(0, maxLen) + "...";
    }
}
