package com.heu.rag.core.controller.dto;

import lombok.Data;

/**
 * Request DTO for verifying email code
 */
@Data
public class CheckCodeRequest {
    private String email;
    private String code;
}
