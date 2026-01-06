package com.heu.rag.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unified response wrapper to match Go backend JSON format.
 * Frontend expects: code, msg, data fields.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {
    
    private int code;
    private String msg;
    private T data;
    
    /**
     * Success response with data.
     */
    public static <T> Result<T> success(T data) {
        return new Result<>(200, "success", data);
    }
    
    /**
     * Success response with custom message.
     */
    public static <T> Result<T> success(String msg, T data) {
        return new Result<>(200, msg, data);
    }
    
    /**
     * Error response with message.
     */
    public static <T> Result<T> error(String msg) {
        return new Result<>(500, msg, null);
    }
    
    /**
     * Error response with custom code and message.
     */
    public static <T> Result<T> error(int code, String msg) {
        return new Result<>(code, msg, null);
    }
}

