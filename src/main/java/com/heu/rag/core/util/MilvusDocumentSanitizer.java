package com.heu.rag.core.util;

import org.springframework.ai.document.Document;
import org.springframework.stereotype.Component;

import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Deep sanitizer for Spring AI Document objects before Milvus insertion.
 * Ensures id/content/metadata (including nested metadata structures) do not contain null values.
 */
@Component
public class MilvusDocumentSanitizer {

    public SanitizeResult sanitize(
            List<Document> sourceDocs,
            Long docId,
            Long baseId,
            String fileName,
            Boolean isEnabled,
            long baseTimestamp) {

        List<String> warnings = new ArrayList<>();
        List<Document> sanitizedDocs = new ArrayList<>();

        if (sourceDocs == null || sourceDocs.isEmpty()) {
            warnings.add("source document list is null/empty");
            return new SanitizeResult(sanitizedDocs, warnings);
        }

        int safeIndex = 0;
        for (int i = 0; i < sourceDocs.size(); i++) {
            Document doc = sourceDocs.get(i);
            if (doc == null) {
                warnings.add(String.format("doc[%d] is null and skipped", i));
                continue;
            }

            String safeId = normalizeString(doc.getId(), null);
            if (safeId == null) {
                safeId = String.format("%d_%d_%d_retry", docId, i, baseTimestamp + i);
                warnings.add(String.format("doc[%d].id is null/blank, generated fallback id=%s", i, safeId));
            }

            String safeContent = normalizeString(doc.getText(), null);
            if (safeContent == null) {
                warnings.add(String.format("doc[%d].content is null/blank and skipped", i));
                continue;
            }

            Map<String, Object> safeMetadata = sanitizeMap(doc.getMetadata(), String.format("doc[%d].metadata", i), warnings);
            safeMetadata.put("docId", normalizeString(String.valueOf(docId), ""));
            safeMetadata.put("baseId", normalizeString(String.valueOf(baseId), ""));
            safeMetadata.put("fileName", normalizeString(fileName, "unnamed-file"));
            safeMetadata.put("chunkIndex", String.valueOf(safeIndex));
            safeMetadata.put("isEnabled", String.valueOf(Boolean.TRUE.equals(isEnabled)));

            sanitizedDocs.add(new Document(safeId, safeContent, safeMetadata));
            safeIndex++;
        }

        return new SanitizeResult(sanitizedDocs, warnings);
    }

    private Map<String, Object> sanitizeMap(Map<String, Object> map, String path, List<String> warnings) {
        Map<String, Object> safeMap = new HashMap<>();
        if (map == null || map.isEmpty()) {
            return safeMap;
        }

        int keyIndex = 0;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            String rawKey = entry.getKey();
            String key = normalizeString(rawKey, null);
            if (key == null) {
                warnings.add(String.format("%s key[%d] is null/blank and dropped", path, keyIndex));
                keyIndex++;
                continue;
            }

            Object safeValue = sanitizeValue(entry.getValue(), path + "." + key, warnings);
            safeMap.put(key, safeValue);
            keyIndex++;
        }
        return safeMap;
    }

    private List<Object> sanitizeCollection(Collection<?> collection, String path, List<String> warnings) {
        List<Object> safeList = new ArrayList<>();
        int idx = 0;
        for (Object item : collection) {
            safeList.add(sanitizeValue(item, String.format("%s[%d]", path, idx), warnings));
            idx++;
        }
        return safeList;
    }

    private List<Object> sanitizeArray(Object arrayObj, String path, List<String> warnings) {
        int len = Array.getLength(arrayObj);
        List<Object> safeList = new ArrayList<>(len);
        for (int i = 0; i < len; i++) {
            Object item = Array.get(arrayObj, i);
            safeList.add(sanitizeValue(item, String.format("%s[%d]", path, i), warnings));
        }
        return safeList;
    }

    private Object sanitizeValue(Object value, String path, List<String> warnings) {
        if (value == null) {
            warnings.add(path + " is null, replaced with empty string");
            return "";
        }

        if (value instanceof String str) {
            return normalizeString(str, "");
        }

        if (value instanceof Map<?, ?> map) {
            Map<String, Object> casted = new HashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = normalizeString(entry.getKey() == null ? null : String.valueOf(entry.getKey()), null);
                if (key == null) {
                    warnings.add(path + " has null/blank nested key, dropped");
                    continue;
                }
                casted.put(key, (Object) entry.getValue());
            }
            return sanitizeMap(casted, path, warnings);
        }

        if (value instanceof Collection<?> collection) {
            return sanitizeCollection(collection, path, warnings);
        }

        if (value.getClass().isArray()) {
            return sanitizeArray(value, path, warnings);
        }

        if (value instanceof Number || value instanceof Boolean) {
            return value;
        }

        // Fallback for unsupported object types to avoid serializer edge cases in SDK.
        warnings.add(path + " type=" + value.getClass().getSimpleName() + " converted to string");
        return normalizeString(String.valueOf(value), "");
    }

    private String normalizeString(String value, String defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? defaultValue : trimmed;
    }

    public record SanitizeResult(List<Document> documents, List<String> warnings) {
    }
}
