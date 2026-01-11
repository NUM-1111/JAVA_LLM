package com.heu.rag.core.util;

import java.util.regex.Pattern;

/**
 * Email validation utility
 */
public class EmailValidator {

    private static final Pattern HRBEU_EMAIL_PATTERN = Pattern.compile("^[a-zA-Z0-9._%+-]+@hrbeu\\.edu\\.cn$");

    /**
     * Validate if email is @hrbeu.edu.cn format
     *
     * @param email Email address to validate
     * @return true if valid
     */
    public static boolean isValidHrbeuEmail(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        return HRBEU_EMAIL_PATTERN.matcher(email).matches();
    }
}
