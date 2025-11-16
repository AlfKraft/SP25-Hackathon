package com.example.hackathonbe.hackathon.controller;

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
class QuestionnaireControllerTest {

    @Mock
    private QuestionnaireService questionnaireService;

    @InjectMocks
    private QuestionnaireController controller;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void getPublicQuestionnaire_returnsBodyFromService() throws Exception {
        // given
        Long hackathonId = 1L;
        JsonNode json = sampleJson();

        when(questionnaireService.getPublicQuestionnaire(hackathonId))
                .thenReturn(json);

        // when
        ResponseEntity<JsonNode> response = controller.getPublicQuestionnaire(hackathonId);

        // then
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(json);
        verify(questionnaireService).getPublicQuestionnaire(hackathonId);
    }

    private JsonNode sampleJson() throws Exception {
        var root = objectMapper.createObjectNode();
        var sections = objectMapper.createArrayNode();
        root.set("sections", sections);
        return root;
    }
}
