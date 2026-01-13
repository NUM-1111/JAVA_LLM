package com.heu.rag.config;

import com.heu.rag.common.Result;
import com.heu.rag.core.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Result<Object>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        log.error("Resource not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Result.error(404, ex.getMessage()));
    }
    
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Result<Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.error("Illegal argument: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Result.error(400, ex.getMessage()));
    }
    
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Result<Object>> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex) {
        log.error("File upload size exceeded: {}", ex.getMessage());
        String errorMessage = "文件大小超过限制。单个文件最大支持100MB，请压缩文件后重试。";
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(Result.error(413, errorMessage));
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Object>> handleGenericException(Exception ex) {
        log.error("Unexpected error occurred", ex);
        
        // Extract root cause message for better error reporting
        String errorMessage = ex.getMessage();
        Throwable cause = ex.getCause();
        if (cause != null && cause.getMessage() != null) {
            errorMessage = cause.getMessage();
        }
        
        // Provide user-friendly error message
        if (errorMessage == null || errorMessage.isEmpty()) {
            errorMessage = "服务器内部错误，请稍后重试";
        }
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.error(500, errorMessage));
    }
}

