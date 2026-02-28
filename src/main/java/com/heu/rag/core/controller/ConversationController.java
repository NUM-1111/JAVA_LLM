package com.heu.rag.core.controller;

import com.heu.rag.common.Result;
import com.heu.rag.core.controller.dto.*;
import com.heu.rag.core.domain.ChatMessage;
import com.heu.rag.core.domain.Conversation;
import com.heu.rag.core.exception.ResourceNotFoundException;
import com.heu.rag.core.repository.ChatMessageRepository;
import com.heu.rag.core.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Conversation Controller
 * Handles conversation and message management
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = { "http://localhost:5173", "http://202.118.184.207" })
@RequiredArgsConstructor
@Slf4j
public class ConversationController {

    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;

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
     * Verify that the conversation belongs to the current user
     */
    private Conversation verifyOwnership(String conversationId, Long userId) {
        Conversation conversation = conversationRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        return conversation;
    }

    /**
     * Get conversation information
     * GET /api/get/conversation/:conversationId
     */
    @GetMapping("/get/conversation/{conversationId}")
    public Result<ConversationDTO> getConversation(@PathVariable String conversationId) {
        Long userId = getUserIdFromContext();
        log.info("Getting conversation: conversationId={}, userId={}", conversationId, userId);

        Conversation conversation = verifyOwnership(conversationId, userId);
        ConversationDTO dto = ConversationDTO.from(conversation);
        return Result.success(dto);
    }

    /**
     * Query conversation list
     * GET /api/query/conversation
     */
    @GetMapping("/query/conversation")
    public Result<Map<String, Object>> queryConversations() {
        Long userId = getUserIdFromContext();
        log.info("Querying conversations for userId={}", userId);

        List<Conversation> conversations = conversationRepository.findByUserId(userId);
        // Sort by updatedAt descending (most recent first)
        conversations.sort((a, b) -> {
            if (a.getUpdatedAt() == null && b.getUpdatedAt() == null)
                return 0;
            if (a.getUpdatedAt() == null)
                return 1;
            if (b.getUpdatedAt() == null)
                return -1;
            return b.getUpdatedAt().compareTo(a.getUpdatedAt());
        });

        List<Map<String, Object>> sessions = conversations.stream()
                .map(conv -> {
                    Map<String, Object> session = new HashMap<>();
                    session.put("conversation_id", conv.getConversationId());
                    session.put("title", conv.getTitle());
                    session.put("baseId", conv.getBaseId() != null ? String.valueOf(conv.getBaseId()) : null);
                    return session;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("sessions", sessions);
        return Result.success(response);
    }

    /**
     * Delete a conversation
     * POST /api/delete/conversation
     */
    @PostMapping("/delete/conversation")
    public Result<String> deleteConversation(@RequestBody ConversationDeleteRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Deleting conversation: conversationId={}, userId={}", request.getConversation_id(), userId);

        Conversation conversation = verifyOwnership(request.getConversation_id(), userId);

        // Delete all messages
        List<ChatMessage> messages = chatMessageRepository.findByConversationId(request.getConversation_id());
        chatMessageRepository.deleteAll(messages);
        log.info("Deleted {} messages for conversation", messages.size());

        // Delete conversation
        conversationRepository.delete(conversation);
        log.info("Deleted conversation: conversationId={}", request.getConversation_id());

        return Result.success("Conversation deleted successfully");
    }

    /**
     * Rename a conversation
     * PUT /api/rename/conversation
     */
    @PutMapping("/rename/conversation")
    public Result<String> renameConversation(@RequestBody ConversationRenameRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Renaming conversation: conversationId={}, newTitle={}, userId={}",
                request.getConversation_id(), request.getTitle(), userId);

        Conversation conversation = verifyOwnership(request.getConversation_id(), userId);

        conversation.setTitle(request.getTitle());
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        log.info("Renamed conversation: conversationId={}", request.getConversation_id());
        return Result.success("Conversation renamed successfully");
    }

    /**
     * Delete all chat records for current user
     * POST /api/delete/chat
     */
    @PostMapping("/delete/chat")
    public Result<String> deleteAllChats() {
        Long userId = getUserIdFromContext();
        log.info("Deleting all chats for userId={}", userId);

        List<Conversation> conversations = conversationRepository.findByUserId(userId);

        for (Conversation conversation : conversations) {
            // Delete all messages
            List<ChatMessage> messages = chatMessageRepository.findByConversationId(conversation.getConversationId());
            chatMessageRepository.deleteAll(messages);
        }

        // Delete all conversations
        conversationRepository.deleteAll(conversations);
        log.info("Deleted {} conversations and all their messages", conversations.size());

        return Result.success("All chat records deleted successfully");
    }

    /**
     * Query messages for a conversation
     * POST /api/query/messages
     */
    @PostMapping("/query/messages")
    public Result<Map<String, Object>> queryMessages(@RequestBody MessageQueryRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Querying messages: conversationId={}, userId={}", request.getConversation_id(), userId);

        // Verify ownership
        verifyOwnership(request.getConversation_id(), userId);

        // Query messages sorted by createdAt ascending
        List<ChatMessage> messages = chatMessageRepository.findByConversationId(
                request.getConversation_id(), Sort.by(Sort.Direction.ASC, "createdAt"));

        // Convert to response format
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        List<Map<String, Object>> messageList = messages.stream()
                .map(msg -> {
                    Map<String, Object> messageMap = new HashMap<>();
                    messageMap.put("message_id", msg.getMessageId());
                    messageMap.put("conversation_id", msg.getConversationId());
                    messageMap.put("parent", msg.getParent());
                    messageMap.put("children", msg.getChildren() != null ? msg.getChildren() : new ArrayList<>());
                    messageMap.put("created_at",
                            msg.getCreatedAt() != null ? msg.getCreatedAt().format(formatter) : null);

                    // Convert message content
                    Map<String, Object> messageContent = msg.getMessage();
                    if (messageContent != null) {
                        Map<String, Object> formattedMessage = new HashMap<>();

                        // Author
                        String role = (String) messageContent.getOrDefault("role", "user");
                        Map<String, Object> author = new HashMap<>();
                        author.put("role", role);
                        formattedMessage.put("author", author);

                        // Content
                        String content = (String) messageContent.getOrDefault("content", "");
                        Map<String, Object> contentMap = new HashMap<>();
                        contentMap.put("text", content);
                        formattedMessage.put("content", contentMap);

                        // Status, thinking, model (simplified for now)
                        formattedMessage.put("status", "finished_successfully");
                        formattedMessage.put("thinking", false);
                        formattedMessage.put("model", null);

                        messageMap.put("message", formattedMessage);
                    }

                    return messageMap;
                })
                .collect(Collectors.toList());

        // Get current_id (latest message ID)
        String currentId = messages.isEmpty() ? null : messages.get(messages.size() - 1).getMessageId();

        Map<String, Object> response = new HashMap<>();
        response.put("current_id", currentId);
        response.put("messages", messageList);

        return Result.success(response);
    }

    /**
     * Get latest message ID for a conversation
     * POST /api/get/latest/id
     */
    @PostMapping("/get/latest/id")
    public Result<Map<String, String>> getLatestId(@RequestBody LatestIdRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Getting latest message ID: conversationId={}, userId={}", request.getConversation_id(), userId);

        // Verify ownership
        verifyOwnership(request.getConversation_id(), userId);

        // Query messages sorted by createdAt descending
        List<ChatMessage> messages = chatMessageRepository.findByConversationId(
                request.getConversation_id(), Sort.by(Sort.Direction.DESC, "createdAt"));

        String currentId = messages.isEmpty() ? null : messages.get(0).getMessageId();

        Map<String, String> response = new HashMap<>();
        response.put("current_id", currentId);

        return Result.success(response);
    }
}
