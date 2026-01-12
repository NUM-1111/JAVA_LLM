package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Request DTO for changing document enabled status
 */
@Data
public class DocumentChangeStatusRequest {
    
    @JsonProperty("docId")
    private Long docId;
    
    @JsonProperty("is_enabled")
    private Boolean isEnabled;
}

