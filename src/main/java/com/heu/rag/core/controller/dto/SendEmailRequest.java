package com.heu.rag.core.controller.dto;

import lombok.Data;

/**
 * Request DTO for sending email verification code
 */
@Data
public class SendEmailRequest {
    private String email;
}
