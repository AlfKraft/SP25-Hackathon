package com.example.hackathonbe.hackathon.controller;

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
 * HTTP-level tests for public QuestionnaireController.
 */
@WebMvcTest(QuestionnaireController.class)
@AutoConfigureMockMvc(addFilters = false)
class QuestionnaireControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    QuestionnaireService questionnaireService;

    @Test
    void getPublicQuestionnaire_returnsJson() throws Exception {
        long hackathonId = 13L;

        JsonNode json = sampleJson();
        when(questionnaireService.getPublicQuestionnaire(hackathonId)).thenReturn(json);

        mockMvc.perform(get("/api/hackathons/{hackathonId}/questionnaire", hackathonId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json(objectMapper.writeValueAsString(json)));

        verify(questionnaireService).getPublicQuestionnaire(hackathonId);
    }

    private JsonNode sampleJson() {
        var root = objectMapper.createObjectNode();
        var sections = objectMapper.createArrayNode();
        root.set("sections", sections);
        return root;
    }
}
