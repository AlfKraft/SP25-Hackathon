package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.*;

import java.util.*;

public class QuestionnaireAnswerResolver {

    private final ObjectMapper objectMapper;

    public QuestionnaireAnswerResolver(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Builds lookup: questionId -> (optionId -> label)
     * using questionnaire.questions JSON (your internal structure).
     */
    public Map<String, Map<String, String>> buildOptionLookup(Questionnaire questionnaire) {
        JsonNode root = questionnaire.getQuestions();
        JsonNode questionsArray = extractQuestionsArray(root);

        if (questionsArray == null) {
            return Map.of();
        }

        Map<String, Map<String, String>> byQuestionId = new HashMap<>();

        for (JsonNode q : questionsArray) {
            if (q == null || !q.isObject()) continue;

            String qid = text(q.get("id"));
            if (qid == null) continue;

            JsonNode options = q.get("options");
            if (options == null || !options.isArray()) continue;

            Map<String, String> optMap = new HashMap<>();
            for (JsonNode opt : options) {
                String oid = text(opt.get("id"));
                String label = text(opt.get("label"));
                if (oid != null && label != null) optMap.put(oid, label);
            }

            if (!optMap.isEmpty()) byQuestionId.put(qid, optMap);
        }

        return byQuestionId;
    }

    private JsonNode extractQuestionsArray(JsonNode root) {
        if (root == null) return null;
        if (root.isArray()) return root;

        // ✅ your current structure: { "questions": [ ... ] }
        JsonNode inner = root.get("questions");
        return (inner != null && inner.isArray()) ? inner : null;
    }

    /**
     * Returns a transformed copy of the stored answers:
     * - MULTI_CHOICE: adds valueOptionLabels + valueOptionIdsRaw, and replaces valueOptionIds with labels for UI
     * - SINGLE_CHOICE: ensures valueText is label (if missing), adds valueOptionIdRaw
     */
    public JsonNode resolveAnswers(JsonNode storedAnswers, Map<String, Map<String, String>> lookup) {
        if (storedAnswers == null) return NullNode.getInstance();

        // Imported answers may be an object; we leave as-is.
        if (!storedAnswers.isArray()) return storedAnswers;

        ArrayNode out = objectMapper.createArrayNode();

        for (JsonNode item : storedAnswers) {
            if (!item.isObject()) {
                out.add(item);
                continue;
            }

            ObjectNode obj = ((ObjectNode) item).deepCopy();

            String type = text(obj.get("type"));
            String questionId = text(obj.get("questionId"));
            Map<String, String> optionMap = questionId != null ? lookup.get(questionId) : null;

            if (optionMap != null && type != null) {
                if ("MULTI_CHOICE".equals(type)) {
                    JsonNode idsNode = obj.get("valueOptionIds");
                    if (idsNode != null && idsNode.isArray()) {
                        // keep raw ids
                        obj.set("valueOptionIdsRaw", idsNode.deepCopy());

                        ArrayNode labels = objectMapper.createArrayNode();
                        ArrayNode newValueOptionIds = objectMapper.createArrayNode(); // will hold labels as strings

                        for (JsonNode idN : idsNode) {
                            String oid = idN.asText(null);
                            String label = oid != null ? optionMap.get(oid) : null;
                            if (label != null) {
                                labels.add(label);
                                newValueOptionIds.add(label);
                            } else if (oid != null) {
                                // fallback: keep original if not found
                                newValueOptionIds.add(oid);
                            }
                        }

                        obj.set("valueOptionLabels", labels);
                        // For admin UI filtering/display: replace with labels
                        obj.set("valueOptionIds", newValueOptionIds);
                    }
                }

                if ("SINGLE_CHOICE".equals(type)) {
                    JsonNode idNode = obj.get("valueOptionId");
                    if (idNode != null && idNode.isTextual()) {
                        String oid = idNode.asText();
                        obj.put("valueOptionIdRaw", oid);

                        // only set valueText if missing/null/empty
                        String currentText = text(obj.get("valueText"));
                        if (currentText == null || currentText.isBlank()) {
                            String label = optionMap.get(oid);
                            if (label != null) obj.put("valueText", label);
                        }
                    }
                }
            }

            out.add(obj);
        }

        return out;
    }

    private static String text(JsonNode node) {
        if (node == null || node.isNull()) return null;
        String v = node.asText(null);
        return v != null && !v.isBlank() ? v : null;
    }
}
