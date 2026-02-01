package com.heu.rag.config;

import org.springframework.context.annotation.Configuration;

/**
 * Configuration for MilvusService dependencies
 * 
 * Note: ObjectMapper is now provided by JacksonConfig to avoid bean conflicts
 * and ensure consistent JSON serialization configuration across the
 * application.
 */
@Configuration
public class MilvusServiceConfig {
    // ObjectMapper bean moved to JacksonConfig to avoid conflicts
    // MilvusService will use the @Primary ObjectMapper from JacksonConfig
}
