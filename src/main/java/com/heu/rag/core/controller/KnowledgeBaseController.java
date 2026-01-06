package com.heu.rag.core.controller;

import com.heu.rag.common.Result;
import com.heu.rag.config.SnowflakeIdGenerator;
import com.heu.rag.core.controller.dto.BaseCreateRequest;
import com.heu.rag.core.domain.Document;
import com.heu.rag.core.domain.KnowledgeBase;
import com.heu.rag.core.exception.ResourceNotFoundException;
import com.heu.rag.core.repository.DocumentRepository;
import com.heu.rag.core.repository.KnowledgeBaseRepository;
import com.heu.rag.core.service.KnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Knowledge Base Controller
 * Handles knowledge base CRUD operations and file uploads
 */
@RestController
@RequestMapping("/api/knowledge")
@CrossOrigin(origins = {"http://localhost:5173", "http://202.118.184.207"})
@RequiredArgsConstructor
@Slf4j
public class KnowledgeBaseController {
    
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentRepository documentRepository;
    private final KnowledgeBaseService knowledgeBaseService;
    private final SnowflakeIdGenerator snowflakeIdGenerator;
    
    /**
     * Create a new knowledge base
     * POST /api/knowledge/create
     */
    @PostMapping("/create")
    public Result<KnowledgeBase> createKnowledgeBase(
            @RequestBody BaseCreateRequest request,
            @RequestParam Long userId) {
        log.info("Creating knowledge base: baseName={}, userId={}", request.getBaseName(), userId);
        
        Long baseId = snowflakeIdGenerator.nextId();
        KnowledgeBase knowledgeBase = KnowledgeBase.builder()
                .baseId(baseId)
                .userId(userId)
                .baseName(request.getBaseName())
                .baseDesc(request.getBaseDesc())
                .build();
        
        knowledgeBase = knowledgeBaseRepository.save(knowledgeBase);
        log.info("Knowledge base created: baseId={}", baseId);
        
        return Result.success(knowledgeBase);
    }
    
    /**
     * Upload and process a file
     * POST /api/knowledge/upload/file
     */
    @PostMapping("/upload/file")
    public Result<Map<String, Object>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long baseId,
            @RequestParam Long userId) {
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
     */
    @GetMapping("/list")
    public Result<List<KnowledgeBase>> listKnowledgeBases(@RequestParam Long userId) {
        log.info("Listing knowledge bases for userId={}", userId);
        
        List<KnowledgeBase> knowledgeBases = knowledgeBaseRepository.findByUserId(userId);
        return Result.success(knowledgeBases);
    }
    
    /**
     * Delete a knowledge base
     * DELETE /api/knowledge/delete/{id}
     */
    @DeleteMapping("/delete/{id}")
    public Result<String> deleteKnowledgeBase(@PathVariable Long id) {
        log.info("Deleting knowledge base: baseId={}", id);
        
        KnowledgeBase knowledgeBase = knowledgeBaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found with id: " + id));
        
        knowledgeBaseRepository.delete(knowledgeBase);
        log.info("Knowledge base deleted: baseId={}", id);
        
        return Result.success("Knowledge base deleted successfully");
    }
    
    /**
     * Get documents for a specific knowledge base
     * GET /api/knowledge/document/list
     */
    @GetMapping("/document/list")
    public Result<List<Document>> listDocuments(@RequestParam Long baseId) {
        log.info("Listing documents for baseId={}", baseId);
        
        List<Document> documents = documentRepository.findByBaseId(baseId);
        return Result.success(documents);
    }
}

