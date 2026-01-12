package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.heu.rag.core.domain.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

/**
 * Document DTO for API responses
 * Converts camelCase field names to snake_case for frontend compatibility
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDTO {

    @JsonProperty("docId")
    private Long docId;

    @JsonProperty("doc_name")
    private String docName;

    @JsonProperty("file_type")
    private String fileType;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("is_enabled")
    private Boolean isEnabled;

    @JsonProperty("status")
    private String status;

    @JsonProperty("total_chunks")
    private Integer totalChunks;

    /**
     * Convert Document entity to DTO
     */
    public static DocumentDTO from(Document document) {
        if (document == null) {
            return null;
        }
        
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        String createdAtStr = document.getCreatedAt() != null 
            ? document.getCreatedAt().format(formatter) 
            : null;
        
        return DocumentDTO.builder()
                .docId(document.getDocId())
                .docName(document.getDocName())
                .fileType(document.getFileType() != null ? document.getFileType().name() : null)
                .createdAt(createdAtStr)
                .isEnabled(document.getIsEnabled())
                .status(document.getStatus() != null ? document.getStatus().name() : null)
                .totalChunks(document.getTotalChunks())
                .build();
    }
}

