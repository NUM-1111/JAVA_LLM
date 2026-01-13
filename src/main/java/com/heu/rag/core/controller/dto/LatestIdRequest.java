package com.heu.rag.core.controller.dto;

import lombok.Data;

/**
 * Request DTO for getting latest message ID
 */
@Data
public class LatestIdRequest {
    private String conversation_id;
}

