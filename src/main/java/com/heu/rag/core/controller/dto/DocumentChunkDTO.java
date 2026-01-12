package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Document Chunk DTO for API responses
 * Represents a single chunk from Milvus vector store
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChunkDTO {

    @JsonProperty("chunk_id")
    private String chunkId;

    @JsonProperty("content")
    private String content;
}

