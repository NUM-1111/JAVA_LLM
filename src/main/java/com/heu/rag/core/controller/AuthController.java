package com.heu.rag.core.controller;

import com.heu.rag.common.Result;
import com.heu.rag.core.controller.dto.LoginRequest;
import com.heu.rag.core.controller.dto.RegisterRequest;
import com.heu.rag.core.domain.User;
import com.heu.rag.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Authentication Controller
 * Handles user login and registration
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:5173", "http://202.118.184.207"})
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    
    private final UserRepository userRepository;
    
    /**
     * User login
     * POST /api/login
     */
    @PostMapping("/login")
    public Result<String> login(@RequestBody LoginRequest request) {
        log.info("Login attempt: username={}", request.getUsername());
        
        // Find user by username
        User user = userRepository.findByUsername(request.getUsername())
                .orElse(null);
        
        if (user == null || !user.getPassword().equals(request.getPassword())) {
            log.warn("Login failed: invalid credentials for username={}", request.getUsername());
            return Result.error("Invalid username or password");
        }
        
        // Generate a dummy token (UUID for now, can be replaced with JWT later)
        String token = UUID.randomUUID().toString();
        log.info("Login successful: username={}, token={}", request.getUsername(), token);
        
        return Result.success(token);
    }
    
    /**
     * User registration
     * POST /api/register
     */
    @PostMapping("/register")
    public Result<String> register(@RequestBody RegisterRequest request) {
        log.info("Registration attempt: username={}, email={}", request.getUsername(), request.getEmail());
        
        // Check if username already exists
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            log.warn("Registration failed: username already exists: {}", request.getUsername());
            return Result.error("Username already exists");
        }
        
        // Check if email already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            log.warn("Registration failed: email already exists: {}", request.getEmail());
            return Result.error("Email already exists");
        }
        
        // Create new user
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(request.getPassword()) // In production, should be hashed
                .build();
        
        user = userRepository.save(user);
        log.info("User registered successfully: userId={}, username={}", user.getId(), user.getUsername());
        
        return Result.success("Registration successful");
    }
}

