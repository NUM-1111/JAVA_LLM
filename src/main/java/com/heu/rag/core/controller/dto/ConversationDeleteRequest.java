package com.heu.rag.core.controller.dto;

import lombok.Data;

/**
 * Request DTO for deleting a conversation
 */
@Data
public class ConversationDeleteRequest {
    private String conversation_id;
}

