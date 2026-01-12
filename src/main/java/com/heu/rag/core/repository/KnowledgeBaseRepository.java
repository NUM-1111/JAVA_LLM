package com.heu.rag.core.repository;

import com.heu.rag.core.domain.KnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, Long> {
    List<KnowledgeBase> findByUserId(Long userId);

    /**
     * Search knowledge bases by name (case-insensitive) for a specific user
     */
    @Query("SELECT kb FROM KnowledgeBase kb WHERE kb.userId = :userId AND LOWER(kb.baseName) LIKE LOWER(CONCAT('%', :baseName, '%')) ORDER BY kb.updatedAt DESC")
    List<KnowledgeBase> findByUserIdAndBaseNameContainingIgnoreCase(@Param("userId") Long userId,
            @Param("baseName") String baseName);
}
