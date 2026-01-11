package com.heu.rag.core.controller.dto;

import lombok.Data;

/**
 * Request DTO for user registration
 */
@Data
public class RegisterRequest {
    private String username;
    private String email;
    private String code; // Email verification code
    private String password;
}
