package com.heu.rag.core.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Security utility class
 * Provides helper methods to get current user information from SecurityContext
 */
public class SecurityUtil {

    /**
     * Get current user ID from SecurityContext
     *
     * @return User ID, or null if not authenticated
     */
    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long) {
            return (Long) authentication.getPrincipal();
        }
        return null;
    }

    /**
     * Check if user is authenticated
     *
     * @return true if authenticated
     */
    public static boolean isAuthenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Long;
    }
}
