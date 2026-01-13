package com.heu.rag.core.controller.dto;

import lombok.Data;

/**
 * Request DTO for querying messages
 */
@Data
public class MessageQueryRequest {
    private String conversation_id;
}

