package com.heu.rag.core.controller;

import com.heu.rag.common.Result;
import com.heu.rag.core.controller.dto.ChangeEmailRequest;
import com.heu.rag.core.controller.dto.ChangeUsernameRequest;
import com.heu.rag.core.controller.dto.UserInfoResponse;
import com.heu.rag.core.domain.ChatMessage;
import com.heu.rag.core.domain.Conversation;
import com.heu.rag.core.domain.Document;
import com.heu.rag.core.domain.KnowledgeBase;
import com.heu.rag.core.domain.User;
import com.heu.rag.core.exception.ResourceNotFoundException;
import com.heu.rag.core.repository.ChatMessageRepository;
import com.heu.rag.core.repository.ConversationRepository;
import com.heu.rag.core.repository.DocumentRepository;
import com.heu.rag.core.repository.KnowledgeBaseRepository;
import com.heu.rag.core.repository.UserRepository;
import com.heu.rag.core.util.EmailValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * User Settings Controller
 * Handles user information modification and account management
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = { "http://localhost:5173", "http://202.118.184.207" })
@RequiredArgsConstructor
@Slf4j
public class UserSettingsController {

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentRepository documentRepository;

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
     * Change username
     * POST /api/change/username
     */
    @PostMapping("/change/username")
    public Result<String> changeUsername(@RequestBody ChangeUsernameRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Change username request: userId={}, newUsername={}", userId, request.getUsername());

        // Validate request
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            return Result.error(400, "Username cannot be empty");
        }

        String newUsername = request.getUsername().trim();

        // Validate username format (3-20 characters, letters, numbers, underscores)
        if (newUsername.length() < 3 || newUsername.length() > 20) {
            return Result.error(400, "Username must be between 3 and 20 characters");
        }

        if (!newUsername.matches("^[a-zA-Z0-9_]+$")) {
            return Result.error(400, "Username can only contain letters, numbers, and underscores");
        }

        // Check if username already exists
        if (userRepository.findByUsername(newUsername).isPresent()) {
            return Result.error(400, "Username already exists");
        }

        // Get user and update
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setUsername(newUsername);
        userRepository.save(user);

        log.info("Username updated successfully: userId={}, newUsername={}", userId, newUsername);
        return Result.success("Username updated successfully");
    }

    /**
     * Change email
     * POST /api/change/email
     */
    @PostMapping("/change/email")
    public Result<String> changeEmail(@RequestBody ChangeEmailRequest request) {
        Long userId = getUserIdFromContext();
        log.info("Change email request: userId={}, newEmail={}", userId, request.getEmail());

        // Validate request
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return Result.error(400, "Email cannot be empty");
        }

        String newEmail = request.getEmail().trim();

        // Validate email format (@hrbeu.edu.cn)
        if (!EmailValidator.isValidHrbeuEmail(newEmail)) {
            return Result.error(400, "Email must be @hrbeu.edu.cn format");
        }

        // Check if email already exists
        if (userRepository.findByEmail(newEmail).isPresent()) {
            return Result.error(400, "Email already exists");
        }

        // Get user and update
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setEmail(newEmail);
        userRepository.save(user);

        log.info("Email updated successfully: userId={}, newEmail={}", userId, newEmail);
        return Result.success("Email updated successfully");
    }

    /**
     * Get user information
     * GET /api/user/info
     */
    @GetMapping("/user/info")
    public Result<UserInfoResponse> getUserInfo() {
        Long userId = getUserIdFromContext();
        log.info("Get user info request: userId={}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserInfoResponse response = new UserInfoResponse(user.getUsername());
        return Result.success(response);
    }

    /**
     * Delete all chat records
     * POST /api/user-settings/delete/chat
     * Note: This endpoint is placed in UserSettingsController as per frontend
     * requirements,
     * but the main endpoint is in ConversationController at /api/delete/chat
     * This is kept as an alternative path to avoid routing conflicts
     */
    @PostMapping("/user-settings/delete/chat")
    @Transactional
    public Result<String> deleteAllChatRecords() {
        Long userId = getUserIdFromContext();
        log.info("Delete all chat records request: userId={}", userId);

        // Find all conversations for the user
        List<Conversation> conversations = conversationRepository.findByUserId(userId);

        // Delete all messages for each conversation
        for (Conversation conversation : conversations) {
            List<ChatMessage> messages = chatMessageRepository.findByConversationId(conversation.getConversationId());
            if (!messages.isEmpty()) {
                chatMessageRepository.deleteAll(messages);
                log.debug("Deleted {} messages for conversation: {}", messages.size(),
                        conversation.getConversationId());
            }
        }

        // Delete all conversations
        if (!conversations.isEmpty()) {
            conversationRepository.deleteAll(conversations);
            log.info("Deleted {} conversations for user: {}", conversations.size(), userId);
        }

        log.info("All chat records deleted successfully: userId={}", userId);
        return Result.success("All chat records deleted successfully");
    }

    /**
     * Delete account (cascade delete all user data)
     * POST /api/delete/account
     */
    @PostMapping("/delete/account")
    @Transactional
    public Result<String> deleteAccount() {
        Long userId = getUserIdFromContext();
        log.info("Delete account request: userId={}", userId);

        // 1. Delete all Conversations and ChatMessages (MongoDB)
        List<Conversation> conversations = conversationRepository.findByUserId(userId);
        for (Conversation conversation : conversations) {
            List<ChatMessage> messages = chatMessageRepository.findByConversationId(conversation.getConversationId());
            if (!messages.isEmpty()) {
                chatMessageRepository.deleteAll(messages);
            }
        }
        if (!conversations.isEmpty()) {
            conversationRepository.deleteAll(conversations);
            log.debug("Deleted {} conversations for user: {}", conversations.size(), userId);
        }

        // 2. Delete all KnowledgeBases and Documents (PostgreSQL)
        List<KnowledgeBase> knowledgeBases = knowledgeBaseRepository.findByUserId(userId);
        for (KnowledgeBase kb : knowledgeBases) {
            // Delete all documents for this knowledge base
            List<Document> documents = documentRepository.findByBaseId(kb.getBaseId());
            for (Document doc : documents) {
                // Delete vectors from Milvus (if docId is stored in metadata)
                // Note: This is a simplified implementation. In production, you may need
                // to query vectors by metadata filter and delete them properly.
                try {
                    // Spring AI VectorStore doesn't have a direct delete by metadata method
                    // This would need to be implemented based on your VectorStore implementation
                    // For now, we'll log a warning and continue
                    log.warn("Vector deletion for docId={} is not implemented. Manual cleanup may be required.",
                            doc.getDocId());
                } catch (Exception e) {
                    log.error("Error deleting vectors for docId={}: {}", doc.getDocId(), e.getMessage());
                }
            }
            documentRepository.deleteAll(documents);
            log.debug("Deleted {} documents for knowledge base: {}", documents.size(), kb.getBaseId());
        }
        if (!knowledgeBases.isEmpty()) {
            knowledgeBaseRepository.deleteAll(knowledgeBases);
            log.debug("Deleted {} knowledge bases for user: {}", knowledgeBases.size(), userId);
        }

        // 3. Delete User entity (PostgreSQL)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        userRepository.delete(user);

        log.info("Account deleted successfully: userId={}", userId);
        return Result.success("Account deleted successfully");
    }
}
