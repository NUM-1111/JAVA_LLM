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
 * Implements the "Write" path: File Upload -> Parsing -> Chunking -> Vectorization -> Storage
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
     * @param file The uploaded file
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
            
            // 4. Splitting: Use TokenTextSplitter to split text into chunks
            log.debug("Starting text chunking...");
            TokenTextSplitter splitter = new TokenTextSplitter();
            List<org.springframework.ai.document.Document> chunks = splitter.apply(parsedDocuments);
            
            log.info("Split document into {} chunks", chunks.size());
            
            // 5. Vectorization & Storage: Convert chunks and inject metadata
            log.debug("Starting vectorization and storage...");
            List<org.springframework.ai.document.Document> chunksWithMetadata = chunks.stream()
                    .map(chunk -> {
                        // Inject metadata: docId for retrieval filtering
                        String content = null;
                        try {
                            content = chunk.getText() != null ? chunk.getText() : chunk.toString();
                        } catch (Exception e) {
                            content = chunk.toString();
                        }
                        org.springframework.ai.document.Document docWithMetadata = new org.springframework.ai.document.Document(
                                chunk.getId(),
                                content,
                                chunk.getMetadata()
                        );
                        docWithMetadata.getMetadata().put("docId", docId.toString());
                        docWithMetadata.getMetadata().put("baseId", baseId.toString());
                        docWithMetadata.getMetadata().put("fileName", fileName);
                        return docWithMetadata;
                    })
                    .collect(Collectors.toList());
            
            // Call vectorStore.add() - This automatically calls Ollama Embedding
            vectorStore.add(chunksWithMetadata);
            log.info("Stored {} chunks in vector store (Milvus)", chunksWithMetadata.size());
            
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

