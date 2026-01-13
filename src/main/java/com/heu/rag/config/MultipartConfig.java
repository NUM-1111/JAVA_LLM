package com.heu.rag.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartResolver;
import org.springframework.web.multipart.support.StandardServletMultipartResolver;

import jakarta.servlet.MultipartConfigElement;

/**
 * Multipart Configuration
 * Ensures file upload size limits are properly configured
 */
@Configuration
@Slf4j
public class MultipartConfig {

    /**
     * Configure multipart file upload settings
     * These settings should match application.yml configuration
     */
    @Bean
    public MultipartConfigElement multipartConfigElement() {
        MultipartConfigFactory factory = new MultipartConfigFactory();

        // Set maximum file size: 100MB
        factory.setMaxFileSize(DataSize.ofMegabytes(100));
        log.info("Multipart max-file-size configured: 100MB");

        // Set maximum request size: 100MB
        factory.setMaxRequestSize(DataSize.ofMegabytes(100));
        log.info("Multipart max-request-size configured: 100MB");

        // Set file size threshold: 2KB (files larger than this will be written to disk)
        factory.setFileSizeThreshold(DataSize.ofKilobytes(2));
        log.info("Multipart file-size-threshold configured: 2KB");

        MultipartConfigElement config = factory.createMultipartConfig();
        log.info("Multipart configuration initialized successfully");

        return config;
    }

    /**
     * Configure multipart resolver
     */
    @Bean
    public MultipartResolver multipartResolver() {
        StandardServletMultipartResolver resolver = new StandardServletMultipartResolver();
        log.info("MultipartResolver configured");
        return resolver;
    }
}
