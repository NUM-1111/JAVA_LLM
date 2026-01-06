package com.heu.rag.core.controller.dto;

import lombok.Data;

@Data
public class ChatRequest {
    private String message;
    private String conversation_id;
    private Long baseId;
}

