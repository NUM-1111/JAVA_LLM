package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Request DTO for deleting document
 */
@Data
public class DocumentDeleteRequest {
    
    @JsonProperty("baseId")
    private Long baseId;
    
    @JsonProperty("docId")
    private Long docId;
}

