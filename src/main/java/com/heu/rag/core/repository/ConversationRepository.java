package com.heu.rag.core.repository;

import com.heu.rag.core.domain.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends MongoRepository<Conversation, String> {
    List<Conversation> findByUserId(Long userId);
    
    Optional<Conversation> findByConversationIdAndUserId(String conversationId, Long userId);
    
    Optional<Conversation> findByConversationId(String conversationId);
}

