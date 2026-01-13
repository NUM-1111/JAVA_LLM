package com.heu.rag.core.controller.dto;

import lombok.Data;

/**
 * Request DTO for renaming a conversation
 */
@Data
public class ConversationRenameRequest {
    private String conversation_id;
    private String title;
}

