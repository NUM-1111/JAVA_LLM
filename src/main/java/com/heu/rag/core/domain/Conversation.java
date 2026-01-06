package com.heu.rag.core.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "conversations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {
    
    @Id
    private String conversationId;
    
    private Long userId;
    
    private String title;
    
    private String currentNode;
    
    private Long baseId;
    
    private String defaultModel;
    
    private Boolean isArchived;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
}

