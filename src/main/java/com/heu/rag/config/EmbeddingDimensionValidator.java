package com.heu.rag.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

/**
 * Logs embedding dimension configuration at startup
 * Note: Actual dimension validation is done by MilvusConfig which checks
 * the collection schema and rebuilds if dimension mismatch is detected.
 */
@Configuration
@Slf4j
@Order(2) // Run after MilvusConfig
public class EmbeddingDimensionValidator implements CommandLineRunner {

    @Value("${spring.ai.vectorstore.milvus.embedding-dimension:3584}")
    private int configuredDimension;

    @Value("${spring.ai.ollama.embedding.model:qwen2.5:7b}")
    private String embeddingModel;

    @Override
    public void run(String... args) {
        log.info("========================================");
        log.info("Embedding Configuration Summary:");
        log.info("  Model: {}", embeddingModel);
        log.info("  Configured Dimension: {}", configuredDimension);
        log.info("  Expected for Qwen2.5:7b: 3584");
        log.info("========================================");
        
        // Validate known model dimensions
        if (embeddingModel.contains("qwen2.5:7b") || embeddingModel.contains("qwen2.5-7b")) {
            if (configuredDimension != 3584) {
                log.warn("⚠️  WARNING: Qwen2.5:7b outputs 3584-dimensional embeddings, " +
                    "but configuration is set to {}. This may cause insertion failures.", configuredDimension);
            } else {
                log.info("✅ Embedding dimension configuration matches Qwen2.5:7b model (3584)");
            }
        } else {
            log.info("ℹ️  Please verify that embedding-dimension ({}) matches your model's output dimension", 
                configuredDimension);
        }
        
        log.info("Note: MilvusConfig will automatically validate and rebuild collection if dimension mismatch is detected.");
    }
}

