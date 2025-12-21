package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
@ExtendWith(MockitoExtension.class)
class QuestionnaireAnswerResolverTest {

    private ObjectMapper objectMapper;
    private QuestionnaireAnswerResolver resolver;

    @BeforeEach
    void setup() {
        objectMapper = new ObjectMapper();
        resolver = new QuestionnaireAnswerResolver(objectMapper);
    }

    // ------------------------------------------------------------------
    // buildOptionLookup
    // ------------------------------------------------------------------

    @Test
    void buildOptionLookup_happyPath_buildsQuestionAndOptionMap() throws JsonProcessingException {
        Questionnaire q = new Questionnaire();
        q.setQuestions(questionnaireQuestionsJson());

        Map<String, Map<String, String>> lookup = resolver.buildOptionLookup(q);

        assertEquals(1, lookup.size());
        assertTrue(lookup.containsKey("q1"));

        Map<String, String> options = lookup.get("q1");
        assertEquals(2, options.size());
        assertEquals("Java", options.get("opt1"));
        assertEquals("Kotlin", options.get("opt2"));
    }

    @Test
    void buildOptionLookup_noQuestionsArray_returnsEmptyMap() {
        Questionnaire q = new Questionnaire();
        q.setQuestions(objectMapper.createObjectNode()); // no "questions" field

        Map<String, Map<String, String>> lookup = resolver.buildOptionLookup(q);

        assertTrue(lookup.isEmpty());
    }

    @Test
    void buildOptionLookup_questionWithoutOptions_isIgnored() throws JsonProcessingException {
        Questionnaire q = new Questionnaire();
        q.setQuestions(objectMapper.readTree("""
            {
              "questions": [
                { "id": "q1", "type": "TEXT" }
              ]
            }
        """));

        Map<String, Map<String, String>> lookup = resolver.buildOptionLookup(q);

        assertTrue(lookup.isEmpty());
    }

    // ------------------------------------------------------------------
    // resolveAnswers
    // ------------------------------------------------------------------

    @Test
    void resolveAnswers_multiChoice_resolvesLabelsAndKeepsRawIds() throws JsonProcessingException {
        JsonNode storedAnswers = objectMapper.readTree("""
            [
              {
                "questionId": "q1",
                "type": "MULTI_CHOICE",
                "valueOptionIds": ["opt1", "opt2"]
              }
            ]
        """);

        Map<String, Map<String, String>> lookup = Map.of(
                "q1", Map.of(
                        "opt1", "Java",
                        "opt2", "Kotlin"
                )
        );

        JsonNode resolved = resolver.resolveAnswers(storedAnswers, lookup);
        JsonNode item = resolved.get(0);

        assertTrue(item.has("valueOptionIdsRaw"));
        assertEquals(2, item.get("valueOptionIdsRaw").size());

        assertTrue(item.has("valueOptionLabels"));
        assertEquals("Java", item.get("valueOptionLabels").get(0).asText());
        assertEquals("Kotlin", item.get("valueOptionLabels").get(1).asText());

        // replaced with labels
        assertEquals("Java", item.get("valueOptionIds").get(0).asText());
        assertEquals("Kotlin", item.get("valueOptionIds").get(1).asText());
    }

    @Test
    void resolveAnswers_multiChoice_unknownOption_keepsOriginalId() throws JsonProcessingException {
        JsonNode storedAnswers = objectMapper.readTree("""
            [
              {
                "questionId": "q1",
                "type": "MULTI_CHOICE",
                "valueOptionIds": ["optX"]
              }
            ]
        """);

        Map<String, Map<String, String>> lookup = Map.of(
                "q1", Map.of("opt1", "Java")
        );

        JsonNode resolved = resolver.resolveAnswers(storedAnswers, lookup);
        JsonNode item = resolved.get(0);

        assertEquals("optX", item.get("valueOptionIds").get(0).asText());
    }

    @Test
    void resolveAnswers_singleChoice_fillsMissingValueText() throws JsonProcessingException {
        JsonNode storedAnswers = objectMapper.readTree("""
            [
              {
                "questionId": "q1",
                "type": "SINGLE_CHOICE",
                "valueOptionId": "opt1"
              }
            ]
        """);

        Map<String, Map<String, String>> lookup = Map.of(
                "q1", Map.of("opt1", "Java")
        );

        JsonNode resolved = resolver.resolveAnswers(storedAnswers, lookup);
        JsonNode item = resolved.get(0);

        assertEquals("opt1", item.get("valueOptionIdRaw").asText());
        assertEquals("Java", item.get("valueText").asText());
    }

    @Test
    void resolveAnswers_singleChoice_existingValueText_isPreserved() throws JsonProcessingException {
        JsonNode storedAnswers = objectMapper.readTree("""
            [
              {
                "questionId": "q1",
                "type": "SINGLE_CHOICE",
                "valueOptionId": "opt1",
                "valueText": "Already set"
              }
            ]
        """);

        Map<String, Map<String, String>> lookup = Map.of(
                "q1", Map.of("opt1", "Java")
        );

        JsonNode resolved = resolver.resolveAnswers(storedAnswers, lookup);
        JsonNode item = resolved.get(0);

        assertEquals("Already set", item.get("valueText").asText());
    }

    @Test
    void resolveAnswers_nonArrayInput_isReturnedAsIs() throws JsonProcessingException {
        JsonNode storedAnswers = objectMapper.readTree("""
            { "imported": true }
        """);

        JsonNode resolved = resolver.resolveAnswers(storedAnswers, Map.of());

        assertEquals(storedAnswers, resolved);
    }

    @Test
    void resolveAnswers_nullInput_returnsNullNode() {
        JsonNode resolved = resolver.resolveAnswers(null, Map.of());

        assertTrue(resolved.isNull());
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private JsonNode questionnaireQuestionsJson() throws JsonProcessingException {
        return objectMapper.readTree("""
            {
              "questions": [
                {
                  "id": "q1",
                  "type": "MULTI_CHOICE",
                  "options": [
                    { "id": "opt1", "label": "Java" },
                    { "id": "opt2", "label": "Kotlin" }
                  ]
                }
              ]
            }
        """);
    }
}
