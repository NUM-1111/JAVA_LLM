package com.heu.rag.core.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "chat_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    
    @Id
    private String messageId;
    
    private String conversationId;
    
    private Map<String, Object> message; // Message as Object
    
    private String parent;
    
    private List<String> children; // Children as List
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
}

