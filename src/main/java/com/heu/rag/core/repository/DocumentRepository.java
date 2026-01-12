package com.heu.rag.core.repository;

import com.heu.rag.core.domain.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByBaseId(Long baseId);
    
    /**
     * Find documents by baseId with pagination
     */
    Page<Document> findByBaseId(Long baseId, Pageable pageable);
    
    /**
     * Find documents by baseId and docName containing search term (case-insensitive) with pagination
     */
    @Query("SELECT d FROM Document d WHERE d.baseId = :baseId AND LOWER(d.docName) LIKE LOWER(CONCAT('%', :search, '%')) ORDER BY d.createdAt DESC")
    Page<Document> findByBaseIdAndDocNameContaining(
            @Param("baseId") Long baseId,
            @Param("search") String search,
            Pageable pageable
    );
    
    /**
     * Count documents by baseId
     */
    long countByBaseId(Long baseId);
    
    /**
     * Count documents by baseId and docName containing search term (case-insensitive)
     */
    @Query("SELECT COUNT(d) FROM Document d WHERE d.baseId = :baseId AND LOWER(d.docName) LIKE LOWER(CONCAT('%', :search, '%'))")
    long countByBaseIdAndDocNameContaining(@Param("baseId") Long baseId, @Param("search") String search);
}

