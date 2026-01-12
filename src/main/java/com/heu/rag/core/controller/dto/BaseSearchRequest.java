package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Request DTO for searching knowledge base
 */
@Data
public class BaseSearchRequest {

    @JsonProperty("base_name")
    private String baseName;
}
