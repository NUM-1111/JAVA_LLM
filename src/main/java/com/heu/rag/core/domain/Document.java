package com.heu.rag.core.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document {
    
    @Id
    @Column(name = "doc_id")
    private Long docId; // Snowflake ID, set manually
    
    @Column(name = "base_id", nullable = false)
    private Long baseId;
    
    @Column(name = "doc_name", nullable = false)
    private String docName;
    
    @Column(name = "file_suffix")
    private String fileSuffix;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "file_type")
    private FileType fileType;
    
    @Column(name = "file_path")
    private String filePath;
    
    @Column(name = "is_enabled")
    private Boolean isEnabled;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ParseStatus status;
    
    @Column(name = "total_chunks")
    private Integer totalChunks;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isEnabled == null) {
            isEnabled = true;
        }
        if (status == null) {
            status = ParseStatus.None;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

