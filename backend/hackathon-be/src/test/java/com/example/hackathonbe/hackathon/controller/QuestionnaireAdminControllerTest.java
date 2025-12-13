package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.auth.security.JwtAuthenticationFilter;
import com.example.hackathonbe.hackathon.dto.QuestionnaireDto;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * HTTP-level tests for QuestionnaireAdminController.
 */
@WebMvcTest(QuestionnaireAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
class QuestionnaireAdminControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    QuestionnaireService questionnaireService;

    @MockBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void getForHackathon_returnsJson() throws Exception {
        long hackathonId = 42L;

        JsonNode json = sampleJson();
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
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1L));

        verify(questionnaireService).getQuestionsForHackathon(hackathonId);
    }

    private JsonNode sampleJson() {
        var root = objectMapper.createObjectNode();
        var sections = objectMapper.createArrayNode();
        root.set("sections", sections);
        return root;
    }
}
