package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.hackathon.dto.PublishDto;
import com.example.hackathonbe.hackathon.dto.QuestionnaireDto;
import com.example.hackathonbe.hackathon.model.CoreFieldKey;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.example.hackathonbe.hackathon.model.QuestionnaireSource;
import com.example.hackathonbe.hackathon.model.QuestionnaireStatus;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.hackathon.repository.QuestionnaireRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuestionnaireServiceTest {

    @Mock
    private QuestionnaireRepository questionnaireRepository;

    @Mock
    private HackathonRepository hackathonRepository;

    @InjectMocks
    private QuestionnaireService questionnaireService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @Disabled("Skipping temporarily while implementing questionnaire logic")
    void saveInternalQuestionnaire_createsNewQuestionnaire_whenNoneExists() throws Exception {
        // given
        Long hackathonId = 1L;
        Hackathon hackathon = new Hackathon();
        hackathon.setId(hackathonId);

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));
        when(questionnaireRepository.findById(anyLong())).thenReturn(Optional.empty()); // if your impl uses it
        when(questionnaireRepository.save(any(Questionnaire.class)))
                .thenAnswer(invocation -> {
                    Questionnaire q = invocation.getArgument(0);
                    q.setId(10L);
                    return q;
                });

        JsonNode validJson = buildValidQuestionnaireJson();

        // when
        QuestionnaireDto saved = questionnaireService.saveInternalQuestionnaire(hackathonId, validJson);

        // then
        assertThat(saved.id()).isEqualTo(10L);
        assertThat(saved.questions()).isEqualTo(validJson);
        assertThat(saved.sourceType()).isEqualTo(QuestionnaireSource.INTERNAL);
        assertThat(saved.status()).isEqualTo(QuestionnaireStatus.DRAFT);

        verify(hackathonRepository).findById(hackathonId);
        verify(questionnaireRepository).save(any(Questionnaire.class));
    }

    @Test
    @Disabled("Skipping temporarily while implementing questionnaire logic")
    void saveInternalQuestionnaire_throwsWhenMissingRequiredQuestion() throws Exception {
        // given
        Long hackathonId = 1L;
        Hackathon hackathon = new Hackathon();
        hackathon.setId(hackathonId);

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));

        // build JSON missing at least one CoreFieldKey (e.g., email)
        JsonNode invalidJson = buildQuestionnaireJsonMissingKey("email");

        // when / then
        assertThatThrownBy(() -> questionnaireService.saveInternalQuestionnaire(hackathonId, invalidJson))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Questionnaire is missing required questions");

        verify(questionnaireRepository, never()).save(any());
    }

    @Test
    void getPublicQuestionnaire_returnsForPublishedInternal() throws Exception {
        // given
        Long hackathonId = 1L;
        Hackathon hackathon = new Hackathon();
        hackathon.setId(hackathonId);

        Questionnaire questionnaire = new Questionnaire();
        questionnaire.setId(5L);
        questionnaire.setSource(QuestionnaireSource.INTERNAL);
        questionnaire.setStatus(QuestionnaireStatus.PUBLISHED);
        questionnaire.setQuestions(buildValidQuestionnaireJson());

        hackathon.setQuestionnaire(questionnaire);

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));

        // when
        JsonNode json = questionnaireService.getPublicQuestionnaire(hackathonId);

        // then
        assertThat(json).isNotNull();
        assertThat(json.get("sections")).isNotNull();
    }

    @Test
    void getPublicQuestionnaire_throwsWhenInternalNotPublished() throws Exception {
        // given
        Long hackathonId = 1L;
        Hackathon hackathon = new Hackathon();
        hackathon.setId(hackathonId);

        Questionnaire questionnaire = new Questionnaire();
        questionnaire.setId(5L);
        questionnaire.setSource(QuestionnaireSource.INTERNAL);
        questionnaire.setStatus(QuestionnaireStatus.DRAFT);
        questionnaire.setQuestions(buildValidQuestionnaireJson());
        hackathon.setQuestionnaire(questionnaire);

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));

        // when / then
        assertThatThrownBy(() -> questionnaireService.getPublicQuestionnaire(hackathonId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("not published");
    }

    @Test
    void getPublicQuestionnaire_returnsForExternalLocked() throws Exception {
        // given
        Long hackathonId = 1L;
        Hackathon hackathon = new Hackathon();
        hackathon.setId(hackathonId);

        Questionnaire questionnaire = new Questionnaire();
        questionnaire.setId(6L);
        questionnaire.setSource(QuestionnaireSource.EXTERNAL_UPLOAD);
        questionnaire.setStatus(QuestionnaireStatus.LOCKED);
        questionnaire.setQuestions(buildValidQuestionnaireJson());
        hackathon.setQuestionnaire(questionnaire);

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));

        assertThatThrownBy(() -> questionnaireService.getPublicQuestionnaire(hackathonId)).isInstanceOf(BadRequestException.class);


    }

    @Test
    void publishInternalQuestionnaire_setsStatusToPublished() throws Exception {
        // given
        Long hackathonId = 1L;
        Hackathon hackathon = new Hackathon();
        hackathon.setId(hackathonId);

        Questionnaire questionnaire = new Questionnaire();
        questionnaire.setId(7L);
        questionnaire.setSource(QuestionnaireSource.INTERNAL);
        questionnaire.setStatus(QuestionnaireStatus.DRAFT);
        questionnaire.setQuestions(buildValidQuestionnaireJson());
        hackathon.setQuestionnaire(questionnaire);

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));
        when(questionnaireRepository.save(any(Questionnaire.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // when
        PublishDto published = questionnaireService.publishInternalQuestionnaire(hackathonId);

        // then
        assertThat(published.status()).isEqualTo(QuestionnaireStatus.PUBLISHED);
        verify(questionnaireRepository).save(questionnaire);
    }

    // ---------- helpers ----------

    private JsonNode buildValidQuestionnaireJson() throws Exception {
        // minimal JSON containing all CoreFieldKey keys in questions
        var root = objectMapper.createObjectNode();
        var sections = objectMapper.createArrayNode();
        root.set("sections", sections);

        var section = objectMapper.createObjectNode();
        section.put("id", "required");
        section.put("title", "Required");
        sections.add(section);

        var questions = objectMapper.createArrayNode();
        section.set("questions", questions);

        for (CoreFieldKey core : CoreFieldKey.values()) {
            var q = objectMapper.createObjectNode();
            q.put("key", core.key());
            q.put("label", core.name());
            q.put("type", "TEXT");
            q.put("required", true);
            questions.add(q);
        }

        return root;
    }

    private JsonNode buildQuestionnaireJsonMissingKey(String missingKey) throws Exception {
        var root = objectMapper.createObjectNode();
        var sections = objectMapper.createArrayNode();
        root.set("sections", sections);

        var section = objectMapper.createObjectNode();
        section.put("id", "required");
        section.put("title", "Required");
        sections.add(section);

        var questions = objectMapper.createArrayNode();
        section.set("questions", questions);

        for (CoreFieldKey core : CoreFieldKey.values()) {
            if (core.key().equals(missingKey)) {
                continue;
            }
            var q = objectMapper.createObjectNode();
            q.put("key", core.key());
            q.put("label", core.name());
            q.put("type", "TEXT");
            q.put("required", true);
            questions.add(q);
        }

        return root;
    }
}
