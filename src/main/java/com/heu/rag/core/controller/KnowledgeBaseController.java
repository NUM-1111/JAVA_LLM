package com.heu.rag.core.controller;

import com.heu.rag.common.Result;
import com.heu.rag.config.SnowflakeIdGenerator;
import com.heu.rag.core.controller.dto.BaseCreateRequest;
import com.heu.rag.core.controller.dto.BaseSearchRequest;
import com.heu.rag.core.controller.dto.BaseUpdateRequest;
import com.heu.rag.core.controller.dto.DocumentDeleteRequest;
import com.heu.rag.core.controller.dto.KnowledgeBaseDTO;
import com.heu.rag.core.service.DocumentService;
import com.heu.rag.core.domain.Document;
import com.heu.rag.core.domain.KnowledgeBase;
import com.heu.rag.core.exception.ResourceNotFoundException;
import com.heu.rag.core.repository.DocumentRepository;
import com.heu.rag.core.repository.KnowledgeBaseRepository;
import com.heu.rag.core.service.KnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Knowledge Base Controller
 * Handles knowledge base CRUD operations and file uploads
 */
@RestController
@RequestMapping("/api/knowledge")
@CrossOrigin(origins = { "http://localhost:5173", "http://202.118.184.207" })
@RequiredArgsConstructor
@Slf4j
public class KnowledgeBaseController {

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentRepository documentRepository;
    private final KnowledgeBaseService knowledgeBaseService;
    private final DocumentService documentService;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    /**
     * Get user ID from SecurityContext (set by JwtAuthenticationFilter)
     */
    private Long getUserIdFromContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long)) {
            throw new IllegalArgumentException("Unauthorized: Invalid authentication");
        }
        return (Long) authentication.getPrincipal();
    }

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
     * Create a new knowledge base
     * POST /api/knowledge/create
     * Request body: {"base_name": "string", "base_desc": "string"}
     */
    @PostMapping("/create")
    public Result<KnowledgeBaseDTO> createKnowledgeBase(@RequestBody BaseCreateRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Creating knowledge base: baseName={}, userId={}", request.getBaseName(), userId);

        if (request.getBaseName() == null || request.getBaseName().trim().isEmpty()) {
            return Result.error(400, "base_name is required");
        }

        Long baseId = snowflakeIdGenerator.nextId();
        KnowledgeBase knowledgeBase = KnowledgeBase.builder()
                .baseId(baseId)
                .userId(userId)
                .baseName(request.getBaseName())
                .baseDesc(request.getBaseDesc())
                .build();

        knowledgeBase = knowledgeBaseRepository.save(knowledgeBase);
        log.info("Knowledge base created: baseId={}", baseId);

        KnowledgeBaseDTO dto = KnowledgeBaseDTO.from(knowledgeBase);
        return Result.success(dto);
    }

    /**
     * Upload and process a file
     * POST /api/knowledge/upload/file
     * Note: This endpoint is kept here for backward compatibility
     * The userId is now obtained from JWT token instead of request parameter
     */
    @PostMapping("/upload/file")
    public Result<Map<String, Object>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long baseId) {
        Long userId = getUserIdFromContext();
        log.info("File upload request: fileName={}, baseId={}, userId={}",
                file.getOriginalFilename(), baseId, userId);

        try {
            knowledgeBaseService.uploadAndProcess(file, baseId, userId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "File uploaded and processed successfully");
            response.put("fileName", file.getOriginalFilename());
            response.put("baseId", baseId);

            return Result.success(response);
        } catch (Exception e) {
            log.error("File upload failed: fileName={}", file.getOriginalFilename(), e);
            return Result.error("File upload failed: " + e.getMessage());
        }
    }

    /**
     * Get list of knowledge bases for current user
     * GET /api/knowledge/list
     * Response: {"code": 200, "msg": "success", "data": {"total": number, "data":
     * [...]}}
     */
    @GetMapping("/list")
    public Result<Map<String, Object>> listKnowledgeBases() {
        Long userId = getUserIdFromContext();
        log.info("Listing knowledge bases for userId={}", userId);

        List<KnowledgeBase> knowledgeBases = knowledgeBaseRepository.findByUserId(userId);
        List<KnowledgeBaseDTO> dtos = knowledgeBases.stream()
                .map(KnowledgeBaseDTO::from)
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("total", dtos.size());
        response.put("data", dtos);

        return Result.success(response);
    }

    /**
     * Get knowledge base details
     * GET /api/knowledge/info/:baseId
     */
    @GetMapping("/info/{baseId}")
    public Result<KnowledgeBaseDTO> getKnowledgeBaseInfo(@PathVariable Long baseId) {
        Long userId = getUserIdFromContext();
        log.info("Getting knowledge base info: baseId={}, userId={}", baseId, userId);

        KnowledgeBase knowledgeBase = knowledgeBaseRepository.findById(baseId)
                .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found"));

        verifyOwnership(baseId, userId);

        KnowledgeBaseDTO dto = KnowledgeBaseDTO.from(knowledgeBase);
        return Result.success(dto);
    }

    /**
     * Edit knowledge base
     * PUT /api/knowledge/edit/:baseId
     * Request body: {"base_name": "string", "base_desc": "string"}
     */
    @PutMapping("/edit/{baseId}")
    public Result<KnowledgeBaseDTO> editKnowledgeBase(
            @PathVariable Long baseId,
            @RequestBody BaseUpdateRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Editing knowledge base: baseId={}, userId={}", baseId, userId);

        KnowledgeBase knowledgeBase = knowledgeBaseRepository.findById(baseId)
                .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found"));

        verifyOwnership(baseId, userId);

        if (request.getBaseName() != null && !request.getBaseName().trim().isEmpty()) {
            knowledgeBase.setBaseName(request.getBaseName());
        }
        if (request.getBaseDesc() != null) {
            knowledgeBase.setBaseDesc(request.getBaseDesc());
        }

        knowledgeBase = knowledgeBaseRepository.save(knowledgeBase);
        log.info("Knowledge base updated: baseId={}", baseId);

        KnowledgeBaseDTO dto = KnowledgeBaseDTO.from(knowledgeBase);
        return Result.success(dto);
    }

    /**
     * Search knowledge bases
     * POST /api/knowledge/search
     * Request body: {"base_name": "string"}
     * Response: {"code": 200, "msg": "success", "data": {"total": number, "data":
     * [...]}}
     */
    @PostMapping("/search")
    public Result<Map<String, Object>> searchKnowledgeBases(@RequestBody BaseSearchRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Searching knowledge bases: baseName={}, userId={}", request.getBaseName(), userId);

        List<KnowledgeBase> knowledgeBases;
        if (request.getBaseName() == null || request.getBaseName().trim().isEmpty()) {
            // If search term is empty, return all knowledge bases for the user
            knowledgeBases = knowledgeBaseRepository.findByUserId(userId);
        } else {
            knowledgeBases = knowledgeBaseRepository.findByUserIdAndBaseNameContainingIgnoreCase(
                    userId, request.getBaseName());
        }

        List<KnowledgeBaseDTO> dtos = knowledgeBases.stream()
                .map(KnowledgeBaseDTO::from)
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("total", dtos.size());
        response.put("data", dtos);

        return Result.success(response);
    }

    /**
     * Delete a knowledge base
     * DELETE /api/knowledge/delete/:baseId
     * Also deletes associated documents and vector data
     */
    @DeleteMapping("/delete/{baseId}")
    @Transactional
    public Result<String> deleteKnowledgeBase(@PathVariable Long baseId) {
        Long userId = getUserIdFromContext();
        log.info("Deleting knowledge base: baseId={}, userId={}", baseId, userId);

        KnowledgeBase knowledgeBase = knowledgeBaseRepository.findById(baseId)
                .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found"));

        verifyOwnership(baseId, userId);

        // Delete associated documents
        List<Document> documents = documentRepository.findByBaseId(baseId);
        log.info("Deleting {} documents for knowledge base: baseId={}", documents.size(), baseId);

        // TODO: Delete vector data from Milvus for each document
        // The VectorStore interface may not have a delete method
        // This would require using Milvus client directly to delete by metadata
        // (baseId)
        // For now, we only delete the document records from the database

        documentRepository.deleteAll(documents);
        log.info("Deleted {} documents", documents.size());

        // Delete the knowledge base
        knowledgeBaseRepository.delete(knowledgeBase);
        log.info("Knowledge base deleted: baseId={}", baseId);

        return Result.success("Knowledge base deleted successfully");
    }

    /**
     * Delete document
     * POST /api/knowledge/delete/document
     */
    @PostMapping("/delete/document")
    public Result<String> deleteDocument(@RequestBody DocumentDeleteRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Deleting document: baseId={}, docId={}, userId={}",
                request.getBaseId(), request.getDocId(), userId);

        try {
            documentService.deleteDocument(request.getBaseId(), request.getDocId(), userId);
            return Result.success("Document deleted successfully");
        } catch (Exception e) {
            log.error("Failed to delete document: baseId={}, docId={}",
                    request.getBaseId(), request.getDocId(), e);
            return Result.error("Failed to delete document: " + e.getMessage());
        }
    }
}
