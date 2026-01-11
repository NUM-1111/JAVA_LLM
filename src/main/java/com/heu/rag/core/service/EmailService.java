package com.heu.rag.core.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Email Service
 * Handles email verification code sending and validation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final StringRedisTemplate redisTemplate;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${email.code.expire:300}") // 5 minutes default
    private Long codeExpireSeconds;

    @Value("${email.reset.token.expire:900}") // 15 minutes default
    private Long resetTokenExpireSeconds;

    /**
     * Send verification code to email
     *
     * @param email Target email address
     * @return true if sent successfully
     */
    public boolean sendVerificationCode(String email) {
        try {
            // Generate 6-digit verification code
            String code = generateVerificationCode();

            // Store code in Redis with expiration
            String redisKey = "email:code:" + email;
            redisTemplate.opsForValue().set(redisKey, code, codeExpireSeconds, TimeUnit.SECONDS);

            // Send email
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(email);
            message.setSubject("邮箱验证码");
            message.setText("您的验证码是: " + code + "\n验证码有效期为5分钟，请勿泄露给他人。");

            mailSender.send(message);

            log.info("Verification code sent to email: {}", email);
            return true;
        } catch (Exception e) {
            log.error("Failed to send verification code to email: {}", email, e);
            return false;
        }
    }

    /**
     * Verify email code
     *
     * @param email Email address
     * @param code  Verification code
     * @return true if code is valid
     */
    public boolean verifyCode(String email, String code) {
        String redisKey = "email:code:" + email;
        String storedCode = redisTemplate.opsForValue().get(redisKey);

        if (storedCode == null) {
            log.warn("Verification code not found or expired for email: {}", email);
            return false;
        }

        if (storedCode.equals(code)) {
            // Delete code after successful verification
            redisTemplate.delete(redisKey);
            log.info("Verification code verified successfully for email: {}", email);
            return true;
        }

        log.warn("Invalid verification code for email: {}", email);
        return false;
    }

    /**
     * Generate reset token and store in Redis
     *
     * @param email Email address
     * @return Reset token
     */
    public String generateResetToken(String email) {
        String token = UUID.randomUUID().toString();
        String redisKey = "reset:token:" + email;
        redisTemplate.opsForValue().set(redisKey, token, resetTokenExpireSeconds, TimeUnit.SECONDS);
        // Also store token -> email mapping for easier lookup
        storeResetTokenMapping(email, token);
        log.info("Reset token generated for email: {}", email);
        return token;
    }

    /**
     * Verify reset token and get email
     *
     * @param token Reset token
     * @return Email address if token is valid, null otherwise
     */
    public String verifyResetToken(String token) {
        // Get email from token -> email mapping
        String redisKey = "reset:token:value:" + token;
        String email = redisTemplate.opsForValue().get(redisKey);

        if (email != null) {
            // Verify the token matches the stored token for this email
            String storedTokenKey = "reset:token:" + email;
            String storedToken = redisTemplate.opsForValue().get(storedTokenKey);
            if (token.equals(storedToken)) {
                return email;
            }
        }

        return null;
    }

    /**
     * Store reset token with email mapping for easier lookup
     *
     * @param email Email address
     * @param token Reset token
     */
    public void storeResetTokenMapping(String email, String token) {
        String tokenKey = "reset:token:value:" + token;
        redisTemplate.opsForValue().set(tokenKey, email, resetTokenExpireSeconds, TimeUnit.SECONDS);
    }

    /**
     * Delete reset token
     *
     * @param email Email address
     */
    public void deleteResetToken(String email) {
        String redisKey = "reset:token:" + email;
        String token = redisTemplate.opsForValue().get(redisKey);
        if (token != null) {
            redisTemplate.delete(redisKey);
            redisTemplate.delete("reset:token:value:" + token);
        }
    }

    /**
     * Generate 6-digit verification code
     */
    private String generateVerificationCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000); // 100000-999999
        return String.valueOf(code);
    }
}
