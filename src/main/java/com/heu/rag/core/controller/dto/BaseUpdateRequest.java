package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Request DTO for updating knowledge base
 */
@Data
public class BaseUpdateRequest {

    @JsonProperty("base_name")
    private String baseName;

    @JsonProperty("base_desc")
    private String baseDesc;
}
