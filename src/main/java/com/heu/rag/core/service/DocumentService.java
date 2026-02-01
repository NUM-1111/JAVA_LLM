package com.heu.rag.core.service;

import com.heu.rag.core.domain.Document;
import com.heu.rag.core.domain.KnowledgeBase;
import com.heu.rag.core.exception.ResourceNotFoundException;
import com.heu.rag.core.repository.DocumentRepository;
import com.heu.rag.core.repository.KnowledgeBaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for handling document management operations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final VectorStore vectorStore;
    private final MilvusService milvusService;

    /**
     * Verify that the knowledge base belongs to the current user
     */
    private void verifyOwnership(Long baseId, Long userId) {
        KnowledgeBase kb = knowledgeBaseRepository.findById(baseId)
                .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found"));
        if (!kb.getUserId().equals(userId)) {
            throw new IllegalArgumentException("User does not have access to this knowledge base");
        }
    }

    /**
     * Verify that the document belongs to a knowledge base owned by the current
     * user
     */
    private void verifyDocumentOwnership(Long docId, Long userId) {
        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        verifyOwnership(document.getBaseId(), userId);
    }

    /**
     * List documents with pagination and search
     * 
     * @param baseId Knowledge base ID
     * @param search Search term for document name (optional)
     * @param limit  Page size
     * @param offset Offset (for pagination)
     * @param userId User ID for ownership verification
     * @return Page of documents
     */
    public Page<Document> listDocuments(Long baseId, String search, int limit, int offset, Long userId) {
        log.info("Listing documents: baseId={}, search={}, limit={}, offset={}, userId={}",
                baseId, search, limit, offset, userId);

        // Verify ownership
        verifyOwnership(baseId, userId);

        // Create pageable
        int page = offset / limit;
        Pageable pageable = PageRequest.of(page, limit, Sort.by("createdAt").descending());

        // Query with or without search
        Page<Document> documents;
        if (search != null && !search.trim().isEmpty()) {
            documents = documentRepository.findByBaseIdAndDocNameContaining(baseId, search.trim(), pageable);
        } else {
            documents = documentRepository.findByBaseId(baseId, pageable);
        }

        log.info("Found {} documents", documents.getTotalElements());
        return documents;
    }

    /**
     * Count documents with optional search
     */
    public long countDocuments(Long baseId, String search, Long userId) {
        verifyOwnership(baseId, userId);

        if (search != null && !search.trim().isEmpty()) {
            return documentRepository.countByBaseIdAndDocNameContaining(baseId, search.trim());
        } else {
            return documentRepository.countByBaseId(baseId);
        }
    }

    /**
     * Get document information by docId
     * 
     * @param docId  Document ID
     * @param userId User ID for ownership verification
     * @return Document name
     */
    public String getDocumentInfo(Long docId, Long userId) {
        log.info("Getting document info: docId={}, userId={}", docId, userId);

        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        verifyDocumentOwnership(docId, userId);

        return document.getDocName();
    }

    /**
     * Get document chunks from Milvus with pagination and search
     * 
     * @param docId  Document ID
     * @param search Search term for content (optional)
     * @param limit  Page size
     * @param offset Offset (for pagination)
     * @param userId User ID for ownership verification
     * @return List of document chunks
     */
    public List<org.springframework.ai.document.Document> getDocumentChunks(Long docId, String search, int limit,
            int offset, Long userId) {
        log.info("Getting document chunks: docId={}, search={}, limit={}, offset={}, userId={}",
                docId, search, limit, offset, userId);

        // Verify ownership
        verifyDocumentOwnership(docId, userId);

        // Use MilvusService to query chunks by docId with metadata filtering
        // This avoids topK(10000) full scan and filters at Milvus level
        List<org.springframework.ai.document.Document> filteredChunks = milvusService.queryChunksByDocId(
                docId, limit, offset);

        log.info("Found {} chunks for document {} (with pagination)", filteredChunks.size(), docId);

        // Apply content search filter if provided
        if (search != null && !search.trim().isEmpty()) {
            String searchLower = search.trim().toLowerCase();
            filteredChunks = filteredChunks.stream()
                    .filter(chunk -> {
                        String content = chunk.getText() != null ? chunk.getText() : chunk.toString();
                        return content.toLowerCase().contains(searchLower);
                    })
                    .collect(Collectors.toList());
        }

        // Apply pagination
        int start = Math.min(offset, filteredChunks.size());
        int end = Math.min(offset + limit, filteredChunks.size());
        return filteredChunks.subList(start, end);
    }

    /**
     * Change document enabled status
     * 
     * @param docId     Document ID
     * @param isEnabled New enabled status
     * @param userId    User ID for ownership verification
     */
    @Transactional
    public void changeDocumentStatus(Long docId, Boolean isEnabled, Long userId) {
        log.info("Changing document status: docId={}, isEnabled={}, userId={}", docId, isEnabled, userId);

        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        verifyDocumentOwnership(docId, userId);

        document.setIsEnabled(isEnabled);
        documentRepository.save(document);

        log.info("Document status updated: docId={}, isEnabled={}", docId, isEnabled);
    }

    /**
     * Rename document
     * 
     * @param docId   Document ID
     * @param newName New document name
     * @param userId  User ID for ownership verification
     */
    @Transactional
    public void renameDocument(Long docId, String newName, Long userId) {
        log.info("Renaming document: docId={}, newName={}, userId={}", docId, newName, userId);

        if (newName == null || newName.trim().isEmpty()) {
            throw new IllegalArgumentException("Document name cannot be empty");
        }

        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        verifyDocumentOwnership(docId, userId);

        document.setDocName(newName.trim());
        documentRepository.save(document);

        log.info("Document renamed: docId={}, newName={}", docId, newName);
    }

    /**
     * Delete document and its chunks from Milvus
     * 
     * @param baseId Knowledge base ID
     * @param docId  Document ID
     * @param userId User ID for ownership verification
     */
    @Transactional
    public void deleteDocument(Long baseId, Long docId, Long userId) {
        log.info("Deleting document: baseId={}, docId={}, userId={}", baseId, docId, userId);

        // Verify ownership
        verifyOwnership(baseId, userId);

        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        if (!document.getBaseId().equals(baseId)) {
            throw new IllegalArgumentException("Document does not belong to the specified knowledge base");
        }

        // Delete chunks from Milvus using MilvusService (metadata-filtered delete)
        try {
            long deletedCount = milvusService.deleteChunksByDocId(docId);
            log.info("Deleted {} vector chunks from Milvus for docId {}", deletedCount, docId);
        } catch (Exception e) {
            log.error("Failed to delete chunks from Milvus for docId {}: {}", docId, e.getMessage(), e);
            // Continue with database deletion even if Milvus deletion fails
        }

        // Delete document from database
        documentRepository.delete(document);

        log.info("Document deleted: docId={}", docId);
    }
}
