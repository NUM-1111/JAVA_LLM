package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Request DTO for renaming document
 */
@Data
public class DocumentRenameRequest {
    
    @JsonProperty("docId")
    private Long docId;
    
    @JsonProperty("doc_name")
    private String docName;
}

