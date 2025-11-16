package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.example.hackathonbe.hackathon.service.QuestionnaireService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuestionnaireAdminControllerTest {

    @Mock
    private QuestionnaireService questionnaireService;

    @InjectMocks
    private QuestionnaireAdminController controller;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void saveInternal_returnsQuestionsFromService() throws Exception {
        // given
        Long hackathonId = 1L;
        JsonNode requestJson = sampleJson();
        Questionnaire q = new Questionnaire();
        q.setId(10L);
        q.setQuestions(requestJson);

        when(questionnaireService.saveInternalQuestionnaire(hackathonId, requestJson))
                .thenReturn(q);

        // when
        ResponseEntity<JsonNode> response = controller.saveInternal(hackathonId, requestJson);

        // then
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(requestJson);
        verify(questionnaireService).saveInternalQuestionnaire(hackathonId, requestJson);
    }


    @Test
    void publishInternal_returnsOk() {
        // given
        Long hackathonId = 3L;

        // when
        ResponseEntity<Void> response = controller.publishInternal(hackathonId);

        // then
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(questionnaireService).publishInternalQuestionnaire(hackathonId);
    }

    @Test
    void getForHackathon_returnsJsonFromService() throws Exception {
        // given
        Long hackathonId = 4L;
        JsonNode json = sampleJson();

        when(questionnaireService.getQuestionsForHackathon(hackathonId))
                .thenReturn(json);

        // when
        ResponseEntity<JsonNode> response = controller.getForHackathon(hackathonId);

        // then
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(json);
        verify(questionnaireService).getQuestionsForHackathon(hackathonId);
    }

    private JsonNode sampleJson() throws Exception {
        var root = objectMapper.createObjectNode();
        var sections = objectMapper.createArrayNode();
        root.set("sections", sections);
        return root;
    }
}