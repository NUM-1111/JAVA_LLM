package com.heu.rag.core.controller;

import com.heu.rag.common.Result;
import com.heu.rag.core.controller.dto.*;
import com.heu.rag.core.service.DocumentService;
import com.heu.rag.core.domain.Document;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Document Management Controller
 * Handles document CRUD operations, file uploads, and chunk queries
 */
@RestController
@RequestMapping("/api/knowledge/document")
@CrossOrigin(origins = { "http://localhost:5173", "http://202.118.184.207" })
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentService documentService;

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
     * Get documents list with pagination and search
     * GET /api/knowledge/document/list
     * Query params: baseId (required), search (optional), limit (optional, default 10), offset (optional, default 0)
     */
    @GetMapping("/list")
    public Result<Map<String, Object>> listDocuments(
            @RequestParam Long baseId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        Long userId = getUserIdFromContext();
        log.info("Listing documents: baseId={}, search={}, limit={}, offset={}", baseId, search, limit, offset);

        try {
            Page<Document> page = documentService.listDocuments(baseId, search, limit, offset, userId);
            long total = documentService.countDocuments(baseId, search, userId);

            List<DocumentDTO> dtos = page.getContent().stream()
                    .map(DocumentDTO::from)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("total", total);
            response.put("data", dtos);

            return Result.success(response);
        } catch (Exception e) {
            log.error("Failed to list documents: baseId={}", baseId, e);
            return Result.error("Failed to list documents: " + e.getMessage());
        }
    }

    /**
     * Get document information
     * GET /api/knowledge/document/:docId
     */
    @GetMapping("/{docId}")
    public Result<String> getDocumentInfo(@PathVariable Long docId) {
        Long userId = getUserIdFromContext();
        log.info("Getting document info: docId={}, userId={}", docId, userId);

        try {
            String docName = documentService.getDocumentInfo(docId, userId);
            return Result.success(docName);
        } catch (Exception e) {
            log.error("Failed to get document info: docId={}", docId, e);
            return Result.error("Failed to get document info: " + e.getMessage());
        }
    }

    /**
     * Get document chunks detail
     * GET /api/knowledge/document/detail
     * Query params: docId (required), search (optional), limit (optional, default 10), offset (optional, default 0)
     */
    @GetMapping("/detail")
    public Result<Map<String, Object>> getDocumentDetail(
            @RequestParam Long docId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        Long userId = getUserIdFromContext();
        log.info("Getting document detail: docId={}, search={}, limit={}, offset={}", docId, search, limit, offset);

        try {
            List<org.springframework.ai.document.Document> chunks = documentService.getDocumentChunks(docId, search, limit, offset, userId);

            List<DocumentChunkDTO> chunkDTOs = chunks.stream()
                    .map(chunk -> DocumentChunkDTO.builder()
                            .chunkId(chunk.getId())
                            .content(chunk.getText() != null ? chunk.getText() : chunk.toString())
                            .build())
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("total", chunks.size()); // Note: This is the filtered/paginated count
            response.put("data", chunkDTOs);

            return Result.success(response);
        } catch (Exception e) {
            log.error("Failed to get document detail: docId={}", docId, e);
            return Result.error("Failed to get document detail: " + e.getMessage());
        }
    }

    /**
     * Change document enabled status
     * POST /api/knowledge/document/change/status
     */
    @PostMapping("/change/status")
    public Result<String> changeDocumentStatus(@RequestBody DocumentChangeStatusRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Changing document status: docId={}, isEnabled={}, userId={}", 
                request.getDocId(), request.getIsEnabled(), userId);

        try {
            documentService.changeDocumentStatus(request.getDocId(), request.getIsEnabled(), userId);
            return Result.success("Document status updated successfully");
        } catch (Exception e) {
            log.error("Failed to change document status: docId={}", request.getDocId(), e);
            return Result.error("Failed to change document status: " + e.getMessage());
        }
    }

    /**
     * Rename document
     * POST /api/knowledge/document/rename
     */
    @PostMapping("/rename")
    public Result<String> renameDocument(@RequestBody DocumentRenameRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Renaming document: docId={}, newName={}, userId={}", 
                request.getDocId(), request.getDocName(), userId);

        try {
            documentService.renameDocument(request.getDocId(), request.getDocName(), userId);
            return Result.success("Document renamed successfully");
        } catch (Exception e) {
            log.error("Failed to rename document: docId={}", request.getDocId(), e);
            return Result.error("Failed to rename document: " + e.getMessage());
        }
    }

}

