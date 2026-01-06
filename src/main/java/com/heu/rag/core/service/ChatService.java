package com.heu.rag.core.service;

import com.heu.rag.core.domain.ChatMessage;
import com.heu.rag.core.repository.ChatMessageRepository;
import com.heu.rag.core.repository.ConversationRepository;
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
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for handling RAG-based chat with streaming support.
 * Implements the "Read" path: Query -> Retrieval -> Prompt Engineering -> Generation -> Persistence
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {
    
    private final ChatModel chatModel;
    private final VectorStore vectorStore;
    private final ChatMessageRepository chatMessageRepository;
    private final ConversationRepository conversationRepository;
    
    /**
     * Process a chat query with RAG: retrieve context, generate response, and stream results.
     * 
     * @param query The user's query
     * @param conversationId The conversation ID (optional, for history)
     * @return Flux of response strings for Server-Sent Events (SSE)
     */
    public Flux<String> chatStream(String query, String conversationId) {
        log.info("Processing chat query: query={}, conversationId={}", query, conversationId);
        
        // 1. Context Retrieval: Search Milvus for top-k similar chunks
        log.debug("Retrieving similar documents from vector store...");
        SearchRequest searchRequest = SearchRequest.builder()
                .query(query)
                .topK(4)
                .similarityThreshold(0.7) // Optional: filter by similarity
                .build();
        
        List<Document> similarDocuments = vectorStore.similaritySearch(searchRequest);
        log.info("Retrieved {} chunks for query", similarDocuments.size());
        
        // Concatenate results into context string
        String context = similarDocuments.stream()
                .map(doc -> {
                    // Try different methods to get content
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
        
        // 2. Prompt Construction: System prompt with context + User query
        String systemText = String.format(
                "You are a helpful assistant. Use the following context to answer the user's question. " +
                "If the context doesn't contain relevant information, say so.\n\nContext:\n%s",
                context
        );
        
        SystemMessage systemMessage = new SystemMessage(systemText);
        UserMessage userMessage = new UserMessage(query);
        
        // 3. History Integration (Bonus): Fetch last 5 messages if conversationId exists
        List<Message> messages = new ArrayList<>();
        messages.add(systemMessage);
        
        if (conversationId != null && !conversationId.isEmpty()) {
            log.debug("Loading conversation history: conversationId={}", conversationId);
            List<ChatMessage> historyMessages = chatMessageRepository.findByConversationId(conversationId);
            
            // Get last 5 messages (simple approach, can be optimized)
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
                        org.springframework.ai.chat.messages.AssistantMessage assistantMsg = 
                                new org.springframework.ai.chat.messages.AssistantMessage(content);
                        messages.add(assistantMsg);
                    }
                }
            }
        }
        
        messages.add(userMessage);
        
        // 4. Generation: Use ChatModel to call Ollama with streaming
        log.debug("Generating response with LLM...");
        Prompt prompt = new Prompt(messages);
        
        Flux<ChatResponse> chatResponseFlux = chatModel.stream(prompt);
        
        // Extract content from ChatResponse and convert to Flux<String>
        Flux<String> responseFlux = chatResponseFlux
                .map(chatResponse -> {
                    if (chatResponse.getResult() != null && chatResponse.getResult().getOutput() != null) {
                        try {
                            return chatResponse.getResult().getOutput().getText() != null ? 
                                   chatResponse.getResult().getOutput().getText() : "";
                        } catch (Exception e) {
                            return chatResponse.getResult().getOutput().toString();
                        }
                    }
                    return "";
                })
                .doOnNext(chunk -> log.trace("Streaming chunk: {}", chunk))
                .doOnComplete(() -> log.info("Streaming completed for query"));
        
        // 5. Persistence: Async save the User query and final AI response to MongoDB
        // Collect the full response for persistence
        Mono<String> fullResponseMono = responseFlux
                .collect(Collectors.joining())
                .cache(); // Cache to allow multiple subscriptions
        
        // Save user message
        if (conversationId != null && !conversationId.isEmpty()) {
            fullResponseMono
                    .flatMap(fullResponse -> {
                        // Save user message
                        ChatMessage userMsg = ChatMessage.builder()
                                .messageId(generateMessageId())
                                .conversationId(conversationId)
                                .message(createMessageMap("user", query))
                                .parent(null)
                                .children(new ArrayList<>())
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();
                        
                        // Save assistant message
                        ChatMessage assistantMsg = ChatMessage.builder()
                                .messageId(generateMessageId())
                                .conversationId(conversationId)
                                .message(createMessageMap("assistant", fullResponse))
                                .parent(userMsg.getMessageId())
                                .children(new ArrayList<>())
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();
                        
                        chatMessageRepository.save(userMsg);
                        chatMessageRepository.save(assistantMsg);
                        
                        log.info("Saved chat messages to MongoDB: conversationId={}", conversationId);
                        return Mono.just(fullResponse);
                    })
                    .subscribe(); // Fire and forget
        }
        
        // Return the streaming response
        return responseFlux;
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
     * Generate a simple message ID (can be enhanced with UUID or Snowflake).
     */
    private String generateMessageId() {
        return "msg_" + System.currentTimeMillis() + "_" + 
               (int)(Math.random() * 10000);
    }
}

