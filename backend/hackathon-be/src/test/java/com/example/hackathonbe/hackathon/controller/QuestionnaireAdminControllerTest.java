package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.auth.security.JwtAuthenticationFilter;
import com.example.hackathonbe.hackathon.dto.ParticipantAnswerDto;
import com.example.hackathonbe.hackathon.dto.PublishDto;
import com.example.hackathonbe.hackathon.dto.QuestionnaireDto;
import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.example.hackathonbe.hackathon.model.QuestionnaireSource;
import com.example.hackathonbe.hackathon.model.QuestionnaireStatus;
import com.example.hackathonbe.hackathon.service.QuestionnaireService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * HTTP-level tests for QuestionnaireAdminController.
 */
@WebMvcTest(QuestionnaireAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
class QuestionnaireAdminControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean QuestionnaireService questionnaireService;

    // If your app registers this filter as a component, keeping this mock avoids context errors.
    @MockBean JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void saveInternal_putInternal_returnsQuestionnaireDto() throws Exception {
        long hackathonId = 42L;

        JsonNode requestJson = sampleQuestionsJson();
        JsonNode returnedJson = sampleQuestionsJson(); // could be modified, but same is fine

        when(questionnaireService.saveInternalQuestionnaire(eq(hackathonId), eq(requestJson)))
                .thenReturn(new QuestionnaireDto(
                        1L,
                        hackathonId,
                        QuestionnaireSource.INTERNAL,
                        false,
                        QuestionnaireStatus.DRAFT,
                        returnedJson
                ));

        mockMvc.perform(put("/api/admin/hackathons/{hackathonId}/questionnaire/internal", hackathonId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestJson))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.hackathonId").value(42));

        verify(questionnaireService).saveInternalQuestionnaire(eq(hackathonId), eq(requestJson));
    }

    @Test
    void publishInternal_postPublish_returnsPublishDto() throws Exception {
        long hackathonId = 99L;

        // Use your real PublishDto constructor/fields.
        // If your PublishDto differs, adjust the asserts accordingly.
        PublishDto publishDto = new PublishDto(
                hackathonId,
                QuestionnaireStatus.PUBLISHED
        );

        when(questionnaireService.publishInternalQuestionnaire(hackathonId)).thenReturn(publishDto);

        mockMvc.perform(post("/api/admin/hackathons/{hackathonId}/questionnaire/publish", hackathonId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.*", not(empty()))) // something is returned
                .andExpect(jsonPath("$.questionnaireId").value( 99))
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        verify(questionnaireService).publishInternalQuestionnaire(hackathonId);
    }

    @Test
    void getForHackathon_getQuestionnaire_returnsJson() throws Exception {
        long hackathonId = 42L;

        JsonNode json = sampleQuestionsJson();
        when(questionnaireService.getQuestionsForHackathon(hackathonId)).thenReturn(
                new QuestionnaireDto(
                        1L,
                        hackathonId,
                        QuestionnaireSource.INTERNAL,
                        false,
                        QuestionnaireStatus.DRAFT,
                        json
                )
        );

        mockMvc.perform(get("/api/admin/hackathons/{hackathonId}/questionnaire", hackathonId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString(MediaType.APPLICATION_JSON_VALUE)))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.hackathonId").value(42))
                .andExpect(jsonPath("$.questions.sections", isA(List.class)));

        verify(questionnaireService).getQuestionsForHackathon(hackathonId);
    }

    @Test
    void editQuestionnaire_postEdit_returnsQuestionsJsonNode() throws Exception {
        long hackathonId = 5L;
        long questionnaireId = 777L;

        JsonNode requestJson = sampleQuestionsJson();

        // Service returns a Questionnaire entity whose getQuestions() will be returned by controller
        Questionnaire q = new Questionnaire();
        JsonNode updatedQuestions = sampleQuestionsJson();
        // Add a little marker so we can assert it’s the returned node
        ((com.fasterxml.jackson.databind.node.ObjectNode) updatedQuestions).put("edited", true);
        q.setQuestions(updatedQuestions);

        when(questionnaireService.editQuestionnaire(eq(hackathonId), eq(questionnaireId), eq(requestJson)))
                .thenReturn(q);

        mockMvc.perform(post("/api/admin/hackathons/{hackathonId}/questionnaire/edit/{questionnaireId}",
                        hackathonId, questionnaireId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestJson))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.sections", isA(List.class)))
                .andExpect(jsonPath("$.edited").value(true));

        verify(questionnaireService).editQuestionnaire(eq(hackathonId), eq(questionnaireId), eq(requestJson));
    }

    @Test
    void getAllAnswers_getAnswers_returnsList() throws Exception {
        long hackathonId = 12L;

        // Build minimal DTO objects; adjust constructor/fields if your ParticipantAnswerDto differs.
        ParticipantAnswerDto a1 = new ParticipantAnswerDto(
                101L,
                "alice@example.com",
                "Alice",
                "First",
                sampleAnswersJson("Alice")
        );
        ParticipantAnswerDto a2 = new ParticipantAnswerDto(
                102L,
                "bob@example.com",
                "Bob",
                "Last",
                sampleAnswersJson("Bob")
        );

        when(questionnaireService.getAllAnswers(hackathonId)).thenReturn(List.of(a1, a2));

        mockMvc.perform(get("/api/admin/hackathons/{hackathonId}/questionnaire/answers", hackathonId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].participantId").value(101))
                .andExpect(jsonPath("$[0].email").value("alice@example.com"))
                .andExpect(jsonPath("$[0].answers.name").value("Alice"))
                .andExpect(jsonPath("$[1].participantId").value(102))
                .andExpect(jsonPath("$[1].email").value("bob@example.com"))
                .andExpect(jsonPath("$[1].answers.name").value("Bob"));

        verify(questionnaireService).getAllAnswers(hackathonId);
    }

    // --------------------
    // Helpers
    // --------------------

    private JsonNode sampleQuestionsJson() {
        var root = objectMapper.createObjectNode();
        var sections = objectMapper.createArrayNode();

        var section = objectMapper.createObjectNode();
        section.put("id", "sec-1");
        section.put("title", "Basics");
        section.set("questions", objectMapper.createArrayNode());

        sections.add(section);
        root.set("sections", sections);

        return root;
    }

    private JsonNode sampleAnswersJson(String name) {
        var root = objectMapper.createObjectNode();
        root.put("name", name);
        return root;
    }
}
