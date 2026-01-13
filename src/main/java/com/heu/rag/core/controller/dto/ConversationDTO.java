package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.heu.rag.core.domain.Conversation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

/**
 * Conversation DTO for API responses
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDTO {
    
    @JsonProperty("conversation_id")
    private String conversationId;
    
    @JsonProperty("title")
    private String title;
    
    @JsonProperty("baseId")
    private Long baseId;
    
    @JsonProperty("created_at")
    private String createdAt;
    
    @JsonProperty("updated_at")
    private String updatedAt;
    
    /**
     * Convert Conversation entity to DTO
     */
    public static ConversationDTO from(Conversation conversation) {
        if (conversation == null) {
            return null;
        }
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        return ConversationDTO.builder()
                .conversationId(conversation.getConversationId())
                .title(conversation.getTitle())
                .baseId(conversation.getBaseId())
                .createdAt(conversation.getCreatedAt() != null ? conversation.getCreatedAt().format(formatter) : null)
                .updatedAt(conversation.getUpdatedAt() != null ? conversation.getUpdatedAt().format(formatter) : null)
                .build();
    }
}

