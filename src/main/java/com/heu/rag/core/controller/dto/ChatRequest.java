package com.heu.rag.core.controller.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.Map;

/**
 * Request DTO for sending chat message
 * Frontend sends complex structure with message object, we extract text from it
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatRequest {

    @JsonProperty("conversation_id")
    private String conversation_id;

    @JsonProperty("baseId")
    private Long baseId;

    // Frontend sends message as an object: {author: {...}, content: {text: "..."},
    // ...}
    @JsonProperty("message")
    private Map<String, Object> message;

    // Additional fields sent by frontend (ignored but kept for compatibility)
    @JsonProperty("action")
    private String action;

    @JsonProperty("message_id")
    private String message_id;

    @JsonProperty("parent")
    private String parent;

    @JsonProperty("model")
    private String model;

    @JsonProperty("use_deep_think")
    private Boolean use_deep_think;

    @JsonProperty("created_at")
    private String created_at;

    /**
     * Extract text from message object
     * Message structure: {content: {text: "..."}, ...}
     */
    public String getMessageText() {
        if (message == null) {
            return null;
        }

        Object contentObj = message.get("content");
        if (contentObj instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) contentObj;
            Object textObj = content.get("text");
            if (textObj instanceof String) {
                return (String) textObj;
            }
        }

        return null;
    }

    /**
     * Get message (for backward compatibility, returns extracted text)
     * 
     * @deprecated Use getMessageText() instead
     */
    @Deprecated
    public String getMessage() {
        return getMessageText();
    }
}
