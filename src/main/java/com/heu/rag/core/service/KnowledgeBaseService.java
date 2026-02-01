package com.heu.rag.core.service;

import com.heu.rag.config.SnowflakeIdGenerator;
import com.heu.rag.core.domain.Document;
import com.heu.rag.core.domain.FileType;
import com.heu.rag.core.domain.ParseStatus;
import com.heu.rag.core.exception.ResourceNotFoundException;
import com.heu.rag.core.repository.DocumentRepository;
import com.heu.rag.core.repository.KnowledgeBaseRepository;
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
import java.util.List;
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

    /**
     * Upload and process a file: parse, chunk, vectorize, and store in Milvus.
     * 
     * @param file   The uploaded file
     * @param baseId The knowledge base ID
     * @param userId The user ID (for validation)
     */
    @Transactional
    public void uploadAndProcess(MultipartFile file, Long baseId, Long userId) {
        log.info("Starting file upload processing: fileName={}, baseId={}, userId={}",
                file.getOriginalFilename(), baseId, userId);

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
        String fileName = file.getOriginalFilename();
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
            List<org.springframework.ai.document.Document> chunksWithMetadata = new java.util.ArrayList<>();
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
                java.util.Map<String, Object> metadata = chunk.getMetadata();
                if (metadata == null) {
                    metadata = new java.util.HashMap<>();
                    log.debug("Chunk at index {} had null metadata, creating new metadata map", chunkIndex);
                } else {
                    // Create a copy to avoid modifying the original
                    metadata = new java.util.HashMap<>(metadata);
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

                    // Validate all chunks have non-empty IDs before insertion
                    for (int i = 0; i < chunksWithMetadata.size(); i++) {
                        org.springframework.ai.document.Document doc = chunksWithMetadata.get(i);
                        String id = doc.getId();
                        if (id == null || id.trim().isEmpty()) {
                            throw new IllegalStateException(
                                    String.format(
                                            "Chunk at index %d has empty ID. All chunks must have valid IDs for Milvus insertion.",
                                            i));
                        }
                        log.debug("Chunk {} has ID: {}", i, id);
                    }

                    vectorStore.add(chunksWithMetadata);
                    log.info("Successfully stored {} chunks in vector store (Milvus)", chunksWithMetadata.size());
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
}
