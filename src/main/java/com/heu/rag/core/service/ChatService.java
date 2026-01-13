package com.heu.rag.core.service;

import com.heu.rag.core.domain.ChatMessage;
import com.heu.rag.core.domain.Conversation;
import com.heu.rag.core.exception.ResourceNotFoundException;
import com.heu.rag.core.repository.ChatMessageRepository;
import com.heu.rag.core.repository.ConversationRepository;
import com.heu.rag.core.repository.KnowledgeBaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for handling RAG-based chat with streaming support.
 * Implements the "Read" path: Query -> Retrieval -> Prompt Engineering ->
 * Generation -> Persistence
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatModel chatModel;
    private final VectorStore vectorStore;
    private final ChatMessageRepository chatMessageRepository;
    private final ConversationRepository conversationRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;

    /**
     * Process a chat query with RAG: retrieve context, generate response, and
     * stream results.
     * 
     * @param query          The user's query
     * @param conversationId The conversation ID (optional, for history)
     * @param baseId         The knowledge base ID (optional, for RAG)
     * @param userId         The user ID (for validation and conversation creation)
     * @return Flux of JSON-formatted response strings for Server-Sent Events (SSE)
     */
    public Flux<String> chatStream(String query, String conversationId, Long baseId, Long userId) {
        log.info("Processing chat query: query={}, conversationId={}, baseId={}, userId={}",
                query, conversationId, baseId, userId);

        // 1. Validate baseId if provided
        if (baseId != null) {
            var knowledgeBase = knowledgeBaseRepository.findById(baseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found"));
            if (!knowledgeBase.getUserId().equals(userId)) {
                throw new IllegalArgumentException("User does not have access to this knowledge base");
            }
        }

        // 2. Get or create conversation
        final String finalConversationId;
        Conversation conversation;
        if (conversationId == null || conversationId.isEmpty()) {
            // Create new conversation
            finalConversationId = UUID.randomUUID().toString();
            String title = generateTitle(query);
            conversation = Conversation.builder()
                    .conversationId(finalConversationId)
                    .userId(userId)
                    .title(title)
                    .baseId(baseId)
                    .currentNode(null)
                    .defaultModel(null)
                    .isArchived(false)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            conversation = conversationRepository.save(conversation);
            log.info("Created new conversation: conversationId={}", finalConversationId);
        } else {
            finalConversationId = conversationId;
            // Verify conversation belongs to user
            conversation = conversationRepository.findByConversationIdAndUserId(finalConversationId, userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
            // Update conversation
            conversation.setUpdatedAt(LocalDateTime.now());
            if (baseId != null) {
                conversation.setBaseId(baseId);
            }
            conversation = conversationRepository.save(conversation);
        }
        final Conversation finalConversation = conversation;

        // 3. Context Retrieval: Search Milvus for top-k similar chunks (if baseId
        // provided)
        String context = "";
        if (baseId != null) {
            log.debug("Retrieving similar documents from vector store...");
            SearchRequest searchRequest = SearchRequest.builder()
                    .query(query)
                    .topK(4)
                    .similarityThreshold(0.7)
                    .build();

            List<Document> similarDocuments = vectorStore.similaritySearch(searchRequest);
            log.info("Retrieved {} chunks for query", similarDocuments.size());

            context = similarDocuments.stream()
                    .map(doc -> {
                        try {
                            return doc.getText() != null ? doc.getText() : doc.toString();
                        } catch (Exception e) {
                            return doc.toString();
                        }
                    })
                    .filter(content -> content != null && !content.isEmpty())
                    .collect(Collectors.joining("\n\n---\n\n"));

            if (context.isEmpty()) {
                log.warn("No context retrieved for query, proceeding without context");
                context = "No relevant context found.";
            }
        }

        // 4. Prompt Construction: System prompt with context + User query
        String systemText;
        if (!context.isEmpty()) {
            systemText = String.format(
                    "You are a helpful assistant. Use the following context to answer the user's question. " +
                            "If the context doesn't contain relevant information, say so.\n\nContext:\n%s",
                    context);
        } else {
            systemText = "You are a helpful assistant.";
        }

        SystemMessage systemMessage = new SystemMessage(systemText);
        UserMessage userMessage = new UserMessage(query);

        // 5. History Integration: Fetch last 5 messages if conversationId exists
        List<Message> messages = new ArrayList<>();
        messages.add(systemMessage);

        if (finalConversationId != null && !finalConversationId.isEmpty()) {
            log.debug("Loading conversation history: conversationId={}", finalConversationId);
            List<ChatMessage> historyMessages = chatMessageRepository.findByConversationId(
                    finalConversationId, Sort.by(Sort.Direction.ASC, "createdAt"));

            // Get last 5 messages
            int historySize = Math.min(5, historyMessages.size());
            for (int i = Math.max(0, historyMessages.size() - historySize); i < historyMessages.size(); i++) {
                ChatMessage msg = historyMessages.get(i);
                Map<String, Object> msgContent = msg.getMessage();
                if (msgContent != null) {
                    String role = (String) msgContent.getOrDefault("role", "user");
                    String content = (String) msgContent.getOrDefault("content", "");
                    if ("user".equals(role)) {
                        messages.add(new UserMessage(content));
                    } else if ("assistant".equals(role)) {
                        org.springframework.ai.chat.messages.AssistantMessage assistantMsg = new org.springframework.ai.chat.messages.AssistantMessage(
                                content);
                        messages.add(assistantMsg);
                    }
                }
            }
        }

        messages.add(userMessage);

        // 6. Generation: Use ChatModel to call Ollama with streaming
        log.debug("Generating response with LLM...");
        Prompt prompt = new Prompt(messages);

        Flux<ChatResponse> chatResponseFlux = chatModel.stream(prompt);

        // 7. Extract content and create two streams: one for JSON events, one for
        // persistence
        Flux<String> contentFlux = chatResponseFlux
                .map(chatResponse -> {
                    if (chatResponse.getResult() != null && chatResponse.getResult().getOutput() != null) {
                        try {
                            return chatResponse.getResult().getOutput().getText() != null
                                    ? chatResponse.getResult().getOutput().getText()
                                    : "";
                        } catch (Exception e) {
                            log.error("Error extracting content", e);
                            return "";
                        }
                    }
                    return "";
                })
                .filter(content -> !content.isEmpty());

        // 8. Format as JSON events for SSE
        Flux<String> jsonEventFlux = contentFlux
                .map(content -> {
                    // Escape JSON special characters
                    String escapedContent = escapeJson(content);
                    return String.format("{\"type\":\"answer_chunk\",\"content\":\"%s\"}", escapedContent);
                })
                .doOnNext(chunk -> log.trace("Streaming chunk: {}", chunk))
                .doOnComplete(() -> log.info("Streaming completed for query"));

        // 9. Add status event at the end
        Flux<String> finalResponseFlux = jsonEventFlux
                .concatWith(Flux.just("{\"type\":\"status\",\"message\":\"ANSWER_DONE\"}"));

        // 10. Persistence: Async save the User query and final AI response to MongoDB
        Mono<String> fullResponseMono = contentFlux
                .collect(Collectors.joining())
                .cache();

        fullResponseMono
                .flatMap(fullResponse -> {
                    try {
                        // Save user message
                        String userMessageId = UUID.randomUUID().toString();
                        ChatMessage userMsg = ChatMessage.builder()
                                .messageId(userMessageId)
                                .conversationId(finalConversationId)
                                .message(createMessageMap("user", query))
                                .parent(null)
                                .children(new ArrayList<>())
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();

                        // Save assistant message
                        String assistantMessageId = UUID.randomUUID().toString();
                        ChatMessage assistantMsg = ChatMessage.builder()
                                .messageId(assistantMessageId)
                                .conversationId(finalConversationId)
                                .message(createMessageMap("assistant", fullResponse))
                                .parent(userMessageId)
                                .children(new ArrayList<>())
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();

                        chatMessageRepository.save(userMsg);
                        chatMessageRepository.save(assistantMsg);

                        // Update conversation currentNode
                        finalConversation.setCurrentNode(assistantMessageId);
                        finalConversation.setUpdatedAt(LocalDateTime.now());
                        conversationRepository.save(finalConversation);

                        log.info("Saved chat messages to MongoDB: conversationId={}", finalConversationId);
                    } catch (Exception e) {
                        log.error("Error saving chat messages", e);
                    }
                    return Mono.empty();
                })
                .subscribe(); // Fire and forget

        // Return the streaming response
        return finalResponseFlux;
    }

    /**
     * Legacy method for backward compatibility
     * 
     * @deprecated Use chatStream(String query, String conversationId, Long baseId,
     *             Long userId) instead
     */
    @Deprecated
    public Flux<String> chatStream(String query, String conversationId) {
        // For backward compatibility, create a simple text response (not JSON events)
        log.warn("Using deprecated chatStream method without userId and baseId");
        return Flux.just("Error: This method is deprecated. Please use the new method with userId and baseId.");
    }

    /**
     * Create a message map for MongoDB storage.
     */
    private Map<String, Object> createMessageMap(String role, String content) {
        Map<String, Object> messageMap = new HashMap<>();
        messageMap.put("role", role);
        messageMap.put("content", content);
        return messageMap;
    }

    /**
     * Generate conversation title from first message (first 30 characters)
     */
    private String generateTitle(String query) {
        if (query == null || query.trim().isEmpty()) {
            return "New Conversation";
        }
        String title = query.trim();
        if (title.length() > 30) {
            title = title.substring(0, 30) + "...";
        }
        return title;
    }

    /**
     * Escape JSON special characters
     */
    private String escapeJson(String content) {
        if (content == null) {
            return "";
        }
        return content
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
