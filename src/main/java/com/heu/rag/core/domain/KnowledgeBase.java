package com.heu.rag.core.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "knowledge_bases")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBase {
    
    @Id
    @Column(name = "base_id")
    private Long baseId; // Snowflake ID, set manually
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "base_name", nullable = false)
    private String baseName;
    
    @Column(name = "base_desc")
    private String baseDesc;
    
    @Column(name = "base_path")
    private String basePath;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

