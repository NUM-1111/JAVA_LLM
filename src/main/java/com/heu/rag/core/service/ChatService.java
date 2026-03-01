package com.heu.rag.core.service;

import com.heu.rag.core.domain.ChatMessage;
import com.heu.rag.core.domain.Conversation;
import com.heu.rag.core.exception.ResourceNotFoundException;
import com.heu.rag.core.repository.ChatMessageRepository;
import com.heu.rag.core.repository.ConversationRepository;
import com.heu.rag.core.repository.KnowledgeBaseRepository;
import com.heu.rag.config.SnowflakeIdGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.atomic.AtomicBoolean;
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
    private final MilvusService milvusService;
    @Qualifier("chatPersistenceExecutor")
    private final ThreadPoolExecutor chatPersistenceExecutor;
    private final SnowflakeIdGenerator snowflakeIdGenerator;
    
    @Value("${rag.retrieval.top-k:8}")
    private int retrievalTopK;

    @Value("${rag.retrieval.similarity-threshold:0.45}")
    private double retrievalThreshold;

    @Value("${rag.retrieval.fallback-threshold:0.2}")
    private double fallbackThreshold;

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

        // 2. Get or create conversation
        final String finalConversationId;
        Conversation conversation;
        if (conversationId == null || conversationId.isEmpty()) {
            // Create new conversation with generated ID using Snowflake algorithm
            finalConversationId = String.valueOf(snowflakeIdGenerator.nextId());
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
            // Try to find existing conversation
            Optional<Conversation> existingConversation = conversationRepository
                    .findByConversationIdAndUserId(finalConversationId, userId);

            if (existingConversation.isPresent()) {
                // Update existing conversation
                conversation = existingConversation.get();
                if (baseId != null
                        && conversation.getBaseId() != null
                        && !conversation.getBaseId().equals(baseId)) {
                    throw new IllegalArgumentException(
                            "Cannot switch knowledge base in the same conversation. Please create a new conversation.");
                }
                conversation.setUpdatedAt(LocalDateTime.now());
                if (baseId != null) {
                    conversation.setBaseId(baseId);
                }
                conversation = conversationRepository.save(conversation);
                log.info("Updated existing conversation: conversationId={}", finalConversationId);
            } else {
                // Conversation doesn't exist, create new one with the provided ID
                // This happens when frontend generates a new conversationId but it's not in DB
                // yet
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
                log.info("Created new conversation with provided ID: conversationId={}", finalConversationId);
            }
        }
        final Conversation finalConversation = conversation;
        final Long effectiveBaseId = resolveEffectiveBaseId(baseId, finalConversation, userId);

        // 3. Context Retrieval: Search Milvus for top-k similar chunks (if baseId
        // provided)
        String context = "";
        if (effectiveBaseId != null) {
            log.debug("Retrieving similar documents from vector store with baseId filter...");
            try {
                // Use MilvusService for baseId-filtered search to prevent cross-base retrieval
                List<Document> similarDocuments = milvusService.similaritySearchWithBaseId(
                        query, effectiveBaseId, retrievalTopK, retrievalThreshold);
                
                // Fallback retrieval with lower threshold to improve recall for vague queries.
                if (similarDocuments.isEmpty() && fallbackThreshold < retrievalThreshold) {
                    log.info("Primary retrieval returned 0 docs, retrying with fallback threshold: {} -> {}",
                            retrievalThreshold, fallbackThreshold);
                    similarDocuments = milvusService.similaritySearchWithBaseId(
                            query, effectiveBaseId, retrievalTopK, fallbackThreshold);
                }

                log.info("Retrieved {} chunks for query (filtered by baseId={})", similarDocuments.size(), effectiveBaseId);

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
                    context = ""; // Keep empty string for buildSystemPrompt to handle appropriately
                }
            } catch (Exception e) {
                // Retrieval failures should not break the whole chat flow.
                log.error("Vector retrieval failed, continuing chat without context: baseId={}", effectiveBaseId, e);
                context = "";
            }
        }

        // 4. Prompt Construction: Build professional system prompt using Prompt
        // Engineering principles
        String systemText = buildSystemPrompt(context);
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

        StringBuilder fullResponseBuilder = new StringBuilder();
        AtomicBoolean persisted = new AtomicBoolean(false);

        // 8. Format as JSON events for SSE
        Flux<String> jsonEventFlux = contentFlux
                .doOnNext(fullResponseBuilder::append)
                .map(content -> {
                    // Escape JSON special characters
                    String escapedContent = escapeJson(content);
                    return String.format("{\"type\":\"answer_chunk\",\"content\":\"%s\"}", escapedContent);
                })
                .doOnNext(chunk -> log.trace("Streaming chunk: {}", chunk))
                .doOnComplete(() -> {
                    log.info("Streaming completed for query");
                    if (persisted.compareAndSet(false, true)) {
                        persistConversationAsync(query, finalConversationId, finalConversation, fullResponseBuilder.toString());
                    }
                });

        // 9. Add conversation_id event at the start (if it's a new conversation)
        // and status event at the end
        Flux<String> finalResponseFlux;
        if (conversationId == null || conversationId.isEmpty()) {
            // New conversation: send conversation_id event first
            // Note: conversationId is a UUID, so it doesn't need JSON escaping, but we'll
            // do it for safety
            String escapedConversationId = escapeJson(finalConversationId);
            String conversationIdEvent = String.format("{\"type\":\"conversation_id\",\"conversation_id\":\"%s\"}",
                    escapedConversationId);
            finalResponseFlux = Flux.just(conversationIdEvent)// 创建包含固定数据的 Flux 流
                    .concatWith(jsonEventFlux)// 串行拼接多个 Flux 流（顺序执行）
                    .concatWith(Flux.just("{\"type\":\"status\",\"message\":\"ANSWER_DONE\"}"));
            log.info("Sending conversation_id event: conversationId={}", finalConversationId);
        } else {
            // Existing conversation: just add status event at the end
            finalResponseFlux = jsonEventFlux
                    .concatWith(Flux.just("{\"type\":\"status\",\"message\":\"ANSWER_DONE\"}"));
        }

        // Return the streaming response
        return finalResponseFlux;
    }

    private Long resolveEffectiveBaseId(Long requestBaseId, Conversation conversation, Long userId) {
        Long effectiveBaseId = requestBaseId != null ? requestBaseId : conversation.getBaseId();
        if (effectiveBaseId != null) {
            validateBaseAccess(effectiveBaseId, userId);
        }
        return effectiveBaseId;
    }

    private void validateBaseAccess(Long baseId, Long userId) {
        var knowledgeBase = knowledgeBaseRepository.findById(baseId)
                .orElseThrow(() -> new ResourceNotFoundException("Knowledge base not found"));
        if (!knowledgeBase.getUserId().equals(userId)) {
            throw new IllegalArgumentException("User does not have access to this knowledge base");
        }
    }

    private void persistConversationAsync(String query, String conversationId, Conversation conversation, String fullResponse) {
        chatPersistenceExecutor.execute(() -> {
            try {
                if (fullResponse == null || fullResponse.isEmpty()) {
                    log.warn("Empty response, skipping persistence: conversationId={}", conversationId);
                    return;
                }

                // Save user message
                // Link to previous current node so history can be reconstructed as a chain
                String previousNodeId = conversation.getCurrentNode();
                String userMessageId = String.valueOf(snowflakeIdGenerator.nextId());
                ChatMessage userMsg = ChatMessage.builder()
                        .messageId(userMessageId)
                        .conversationId(conversationId)
                        .message(createMessageMap("user", query))
                        .parent(previousNodeId)
                        .children(new ArrayList<>())
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                // Save assistant message
                String assistantMessageId = String.valueOf(snowflakeIdGenerator.nextId());
                ChatMessage assistantMsg = ChatMessage.builder()
                        .messageId(assistantMessageId)
                        .conversationId(conversationId)
                        .message(createMessageMap("assistant", fullResponse))
                        .parent(userMessageId)
                        .children(new ArrayList<>())
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                chatMessageRepository.save(userMsg);
                chatMessageRepository.save(assistantMsg);

                // Update parent node's children list to maintain conversation tree structure
                // This ensures bidirectional links in the conversation tree (parent <-> children)
                try {
                    // Initialize children list if null (defensive programming)
                    if (userMsg.getChildren() == null) {
                        userMsg.setChildren(new ArrayList<>());
                    }
                    // Add assistant message ID to parent's children list
                    if (!userMsg.getChildren().contains(assistantMessageId)) {
                        userMsg.getChildren().add(assistantMessageId);
                        userMsg.setUpdatedAt(LocalDateTime.now());
                        chatMessageRepository.save(userMsg);
                        log.debug("Updated parent message children list: parentId={}, childId={}",
                                userMessageId, assistantMessageId);
                    } else {
                        log.warn("Assistant message ID already exists in parent's children list: " +
                                "parentId={}, childId={}", userMessageId, assistantMessageId);
                    }
                } catch (Exception e) {
                    // Log error but don't fail the entire persistence operation
                    // The parent-child relationship is important but not critical for basic
                    // functionality
                    log.error("Error updating parent message children list: parentId={}, childId={}, " +
                            "conversationId={}", userMessageId, assistantMessageId, conversationId, e);
                }

                // Update conversation currentNode
                conversation.setCurrentNode(assistantMessageId);
                conversation.setUpdatedAt(LocalDateTime.now());
                conversationRepository.save(conversation);

                log.info("Saved chat messages to MongoDB: conversationId={}, userMessageId={}, " +
                        "assistantMessageId={}", conversationId, userMessageId, assistantMessageId);
            } catch (Exception e) {
                log.error("Error saving chat messages: conversationId={}", conversationId, e);
            }
        });
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
     * Build professional system prompt using Prompt Engineering best practices.
     * 
     * This method implements key Prompt Engineering principles:
     * 1. Role Definition: Clearly defines the AI's role and expertise
     * 2. Output Format: Specifies response structure and format requirements
     * 3. Hallucination Prevention: Strictly limits answers to provided context
     * 4. Tone & Style: Sets professional, accurate, and helpful communication style
     * 5. Context Usage Rules: Defines how to use retrieved context effectively
     * 
     * @param context The retrieved context from vector search (can be empty)
     * @return A well-structured system prompt string
     */
    private String buildSystemPrompt(String context) {
        StringBuilder prompt = new StringBuilder();

        // 1. Role Definition: Define AI's identity and expertise
        prompt.append("You are a professional RAG (Retrieval-Augmented Generation) assistant " +
                "specialized in answering questions based on provided knowledge base documents. " +
                "Your role is to help users find accurate information and provide clear, " +
                "well-structured answers.\n\n");

        // 2. Output Format Requirements
        prompt.append("## Output Format Requirements:\n");
        prompt.append("- Provide clear, well-organized answers with proper structure\n");
        prompt.append("- Use markdown formatting when appropriate (headings, lists, code blocks)\n");
        prompt.append("- Break down complex answers into logical sections\n");
        prompt.append("- Keep responses concise but comprehensive\n\n");

        // 3. Hallucination Prevention & Context Usage Rules
        if (context != null && !context.trim().isEmpty()) {
            prompt.append("## Critical Rules for Answering:\n");
            prompt.append("1. **STRICTLY base your answer ONLY on the provided context below**\n");
            prompt.append("2. **DO NOT** make up information, speculate, or use knowledge outside the context\n");
            prompt.append("3. **DO NOT** assume facts not explicitly stated in the context\n");
            prompt.append("4. If the context does not contain enough information to answer the question, " +
                    "explicitly state: \"Based on the provided context, I cannot find sufficient information " +
                    "to answer this question. Please provide more relevant documents or rephrase your question.\"\n");
            prompt.append("5. If the context is partially relevant, acknowledge what you can answer " +
                    "and what you cannot\n");
            prompt.append(
                    "6. Cite specific parts of the context when possible (e.g., \"According to the context...\")\n\n");

            // 4. Context Section
            prompt.append("## Provided Context:\n");
            prompt.append("The following context has been retrieved from the knowledge base:\n\n");
            prompt.append("---\n");
            prompt.append(context);
            prompt.append("\n---\n\n");
        } else {
            // No context available
            prompt.append("## Important Notice:\n");
            prompt.append("No relevant context was retrieved from the knowledge base for this query. " +
                    "Please inform the user that you cannot provide a specific answer based on the knowledge base, " +
                    "and suggest they:\n");
            prompt.append("- Rephrase their question\n");
            prompt.append("- Provide more specific keywords\n");
            prompt.append("- Check if relevant documents have been uploaded to the knowledge base\n\n");
        }

        // 5. Tone & Style Guidelines
        prompt.append("## Communication Style:\n");
        prompt.append("- Maintain a professional, friendly, and helpful tone\n");
        prompt.append("- Be accurate and precise in your answers\n");
        prompt.append("- Use clear, accessible language while maintaining technical accuracy\n");
        prompt.append("- If technical terms are used, provide brief explanations when helpful\n");
        prompt.append("- Be honest about limitations and uncertainties\n\n");

        // 6. Final Instructions
        prompt.append("Now, please answer the user's question following all the rules and guidelines above.");

        return prompt.toString();
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
