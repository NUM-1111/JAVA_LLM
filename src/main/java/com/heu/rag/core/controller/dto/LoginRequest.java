package com.heu.rag.core.controller.dto;

import lombok.Data;

/**
 * Request DTO for user login
 * account can be either username or email
 */
@Data
public class LoginRequest {
    private String account; // Can be username or email
    private String password;
}
