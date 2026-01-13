package com.heu.rag.core.repository;

import com.heu.rag.core.domain.ChatMessage;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findByConversationId(String conversationId);
    
    List<ChatMessage> findByConversationId(String conversationId, Sort sort);
    
    Optional<ChatMessage> findByMessageId(String messageId);
}

