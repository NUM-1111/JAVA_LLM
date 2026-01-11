package com.heu.rag.core.controller.dto;

import lombok.Data;

/**
 * Request DTO for resetting password
 */
@Data
public class ResetPasswordRequest {
    private String token;
    private String newPassword;
}
