package com.heu.rag.core.controller;

import com.heu.rag.core.controller.dto.ChatRequest;
import com.heu.rag.core.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

/**
 * Chat Controller
 * Handles RAG-based chat with streaming support
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:5173", "http://202.118.184.207"})
@RequiredArgsConstructor
@Slf4j
public class ChatController {
    
    private final ChatService chatService;
    
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
     * Send a new chat message and get streaming response
     * POST /api/new/message
     * 
     * Returns Server-Sent Events (SSE) stream for React frontend
     */
    @PostMapping(value = "/new/message", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> newMessage(@RequestBody ChatRequest request) {
        Long userId = getUserIdFromContext();
        log.info("New chat message: conversationId={}, baseId={}, userId={}", 
                request.getConversation_id(), request.getBaseId(), userId);
        
        String query = request.getMessage();
        String conversationId = request.getConversation_id();
        Long baseId = request.getBaseId();
        
        if (query == null || query.trim().isEmpty()) {
            log.warn("Empty query received");
            return Flux.just("data: {\"type\":\"error\",\"message\":\"Query cannot be empty\"}\n\n");
        }
        
        // Call chatService to get streaming response
        return chatService.chatStream(query, conversationId, baseId, userId)
                .map(json -> "data: " + json + "\n\n")  // Format as SSE
                .doOnError(error -> log.error("Error in chat stream", error))
                .onErrorResume(error -> Flux.just("data: {\"type\":\"error\",\"message\":\"" + 
                        error.getMessage().replace("\"", "\\\"") + "\"}\n\n"));
    }
}

