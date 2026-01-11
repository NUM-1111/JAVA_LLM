package com.heu.rag.core.controller;

import com.heu.rag.common.Result;
import com.heu.rag.core.controller.dto.*;
import com.heu.rag.core.domain.User;
import com.heu.rag.core.repository.UserRepository;
import com.heu.rag.core.service.EmailService;
import com.heu.rag.core.util.EmailValidator;
import com.heu.rag.core.util.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication Controller
 * Handles user login, registration, email verification, password reset, and
 * user info
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenUtil jwtTokenUtil;
    private final EmailService emailService;

    /**
     * Email verification feature toggle
     * Set email.verification.enabled=false to disable email verification during
     * development
     * Set email.verification.enabled=true to enable email verification (production)
     */
    @Value("${email.verification.enabled:false}")
    private boolean emailVerificationEnabled;

    /**
     * User login
     * POST /api/login
     * Supports login with username or email
     */
    @PostMapping("/login")
    public Result<String> login(@RequestBody LoginRequest request) {
        log.info("Login attempt: account={}", request.getAccount());

        if (request.getAccount() == null || request.getPassword() == null) {
            return Result.error(400, "Account and password are required");
        }

        // Try to find user by username or email
        User user = null;
        if (request.getAccount().contains("@")) {
            // Try email login
            user = userRepository.findByEmail(request.getAccount()).orElse(null);
        } else {
            // Try username login
            user = userRepository.findByUsername(request.getAccount()).orElse(null);
        }

        if (user == null) {
            log.warn("Login failed: user not found for account={}", request.getAccount());
            return Result.error(401, "Invalid account or password");
        }

        // Verify password using BCrypt
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Login failed: invalid password for account={}", request.getAccount());
            return Result.error(401, "Invalid account or password");
        }

        // Generate JWT token
        String token = jwtTokenUtil.generateToken(user.getId(), user.getUsername());
        log.info("Login successful: userId={}, username={}", user.getId(), user.getUsername());

        return Result.success(token);
    }

    /**
     * User registration
     * POST /api/register
     * Email verification code is optional based on email.verification.enabled
     * config
     * 
     * TODO: When email verification is ready for production:
     * 1. Set email.verification.enabled=true in application.yml
     * 2. Frontend will automatically show verification code input when enabled
     */
    @PostMapping("/register")
    public Result<String> register(@RequestBody RegisterRequest request) {
        log.info("Registration attempt: username={}, email={}, emailVerificationEnabled={}",
                request.getUsername(), request.getEmail(), emailVerificationEnabled);

        // Validate required fields
        if (request.getUsername() == null || request.getEmail() == null
                || request.getPassword() == null) {
            return Result.error(400, "Username, email and password are required");
        }

        // Validate email format (@hrbeu.edu.cn)
        if (!EmailValidator.isValidHrbeuEmail(request.getEmail())) {
            return Result.error(400, "Email must be @hrbeu.edu.cn format");
        }

        // ============================================
        // EMAIL VERIFICATION (CONDITIONAL)
        // ============================================
        // When email.verification.enabled=true:
        // - Requires verification code
        // - Validates code before registration
        // When email.verification.enabled=false:
        // - Skips verification code check
        // - Allows registration without code
        // ============================================
        if (emailVerificationEnabled) {
            // Email verification is enabled - require and validate code
            if (request.getCode() == null || request.getCode().isEmpty()) {
                return Result.error(400, "Verification code is required");
            }
            if (!emailService.verifyCode(request.getEmail(), request.getCode())) {
                return Result.error(400, "Invalid or expired verification code");
            }
            log.info("Email verification code validated successfully");
        } else {
            // Email verification is disabled - skip code validation
            log.info("Email verification is disabled - skipping code validation");
        }

        // Check if username already exists
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            log.warn("Registration failed: username already exists: {}", request.getUsername());
            return Result.error(400, "Username already exists");
        }

        // Check if email already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            log.warn("Registration failed: email already exists: {}", request.getEmail());
            return Result.error(400, "Email already exists");
        }

        // Create new user with encrypted password
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        user = userRepository.save(user);
        log.info("User registered successfully: userId={}, username={}", user.getId(), user.getUsername());

        // Generate JWT token for auto-login after registration
        String token = jwtTokenUtil.generateToken(user.getId(), user.getUsername());
        return Result.success(token);
    }

    /**
     * Send email verification code
     * POST /api/send/email
     */
    @PostMapping("/send/email")
    public Result<String> sendEmail(@RequestBody SendEmailRequest request) {
        log.info("Send email verification code request: email={}", request.getEmail());

        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            return Result.error(400, "Email is required");
        }

        // Validate email format
        if (!EmailValidator.isValidHrbeuEmail(request.getEmail())) {
            return Result.error(400, "Email must be @hrbeu.edu.cn format");
        }

        // Send verification code
        boolean sent = emailService.sendVerificationCode(request.getEmail());
        if (sent) {
            log.info("Verification code sent successfully to: {}", request.getEmail());
            return Result.success("Verification code sent successfully");
        } else {
            log.error("Failed to send verification code to: {}", request.getEmail());
            return Result.error(500, "Failed to send verification code");
        }
    }

    /**
     * Verify email code (for password reset)
     * POST /api/checkcode
     * Returns reset token if code is valid
     */
    @PostMapping("/checkcode")
    public Result<String> checkCode(@RequestBody CheckCodeRequest request) {
        log.info("Verify email code request: email={}", request.getEmail());

        if (request.getEmail() == null || request.getCode() == null) {
            return Result.error(400, "Email and code are required");
        }

        // Verify code
        if (!emailService.verifyCode(request.getEmail(), request.getCode())) {
            return Result.error(400, "Invalid or expired verification code");
        }

        // Generate reset token (automatically stores mapping)
        String resetToken = emailService.generateResetToken(request.getEmail());

        log.info("Email code verified successfully, reset token generated for: {}", request.getEmail());
        return Result.success(resetToken);
    }

    /**
     * Reset password
     * POST /api/reset/password
     */
    @PostMapping("/reset/password")
    public Result<String> resetPassword(@RequestBody ResetPasswordRequest request) {
        log.info("Reset password request");

        if (request.getToken() == null || request.getNewPassword() == null) {
            return Result.error(400, "Token and new password are required");
        }

        // Verify reset token and get email
        String email = emailService.verifyResetToken(request.getToken());
        if (email == null) {
            return Result.error(400, "Invalid or expired reset token");
        }

        // Find user by email
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return Result.error(404, "User not found");
        }

        // Update password with BCrypt encryption
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Delete reset token
        emailService.deleteResetToken(email);

        log.info("Password reset successfully for user: {}", email);
        return Result.success("Password reset successfully");
    }

    /**
     * Get user information
     * GET /api/user/info
     * Requires JWT authentication
     */
    @GetMapping("/user/info")
    public Result<UserInfoResponse> getUserInfo() {
        // Get user ID from SecurityContext (set by JwtAuthenticationFilter)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long)) {
            return Result.error(401, "Unauthorized");
        }

        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return Result.error(404, "User not found");
        }

        UserInfoResponse response = new UserInfoResponse(user.getUsername());
        return Result.success(response);
    }
}
