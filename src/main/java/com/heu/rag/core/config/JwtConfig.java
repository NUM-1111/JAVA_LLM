package com.heu.rag.core.config;

import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * JWT Configuration
 * Provides JWT secret key and expiration settings
 */
@Configuration
@Getter
public class JwtConfig {

    @Value("${jwt.secret:your-secret-key-must-be-at-least-256-bits-long-for-hs256-algorithm}")
    private String secret;

    @Value("${jwt.expiration:86400000}") // 24 hours in milliseconds
    private Long expiration;

    /**
     * Create SecretKey bean for JWT signing
     */
    @Bean
    public SecretKey secretKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
