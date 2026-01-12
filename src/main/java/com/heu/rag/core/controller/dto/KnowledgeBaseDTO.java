package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.heu.rag.core.domain.KnowledgeBase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Knowledge Base DTO for API responses
 * Converts camelCase field names to snake_case for frontend compatibility
 * Serializes baseId as string to avoid JavaScript number precision loss
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseDTO {
    
    @JsonProperty("baseId")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long baseId;
    
    @JsonProperty("base_name")
    private String baseName;
    
    @JsonProperty("base_desc")
    private String baseDesc;
    
    /**
     * Convert KnowledgeBase entity to DTO
     */
    public static KnowledgeBaseDTO from(KnowledgeBase knowledgeBase) {
        if (knowledgeBase == null) {
            return null;
        }
        return KnowledgeBaseDTO.builder()
                .baseId(knowledgeBase.getBaseId())
                .baseName(knowledgeBase.getBaseName())
                .baseDesc(knowledgeBase.getBaseDesc())
                .build();
    }
}
