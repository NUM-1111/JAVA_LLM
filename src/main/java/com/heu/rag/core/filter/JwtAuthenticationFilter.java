package com.heu.rag.core.filter;

import com.heu.rag.core.util.JwtTokenUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * JWT Authentication Filter
 * Intercepts requests and validates JWT tokens
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenUtil jwtTokenUtil;

    // Public endpoints that don't require authentication
    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/login",
            "/api/register",
            "/api/send/email",
            "/api/checkcode",
            "/api/reset/password"
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String requestPath = request.getRequestURI();

        // Skip authentication for public endpoints
        if (isPublicEndpoint(requestPath)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract token from Authorization header
        String token = getTokenFromRequest(request);

        if (StringUtils.hasText(token) && jwtTokenUtil.validateToken(token)) {
            // Extract user info from token
            Long userId = jwtTokenUtil.getUserIdFromToken(token);
            String username = jwtTokenUtil.getUsernameFromToken(token);

            if (userId != null && username != null) {
                // Set authentication in SecurityContext
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userId,
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);

                log.debug("JWT authentication successful for user: {}", username);
            }
        } else {
            log.warn("JWT authentication failed for path: {}", requestPath);
            // Don't set authentication, will result in 401 if endpoint requires auth
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extract JWT token from Authorization header
     * Format: Authorization: {token} (no Bearer prefix as per frontend spec)
     */
    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken)) {
            // Frontend sends token directly without "Bearer " prefix
            return bearerToken.trim();
        }
        return null;
    }

    /**
     * Check if the request path is a public endpoint
     */
    private boolean isPublicEndpoint(String path) {
        for (String endpoint : PUBLIC_ENDPOINTS) {
            if (path.equals(endpoint) || path.startsWith(endpoint + "/")) {
                return true;
            }
        }
        return false;
    }
}
