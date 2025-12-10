package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.hackathon.dto.HackathonCreateRequest;
import com.example.hackathonbe.hackathon.dto.HackathonUpdateRequest;
import com.example.hackathonbe.hackathon.exception.HackathonValidationException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HackathonAdminServiceTest {

    @Mock
    private HackathonRepository hackathonRepository;

    @InjectMocks
    private AdminHackathonService hackathonService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {

    }

    private HackathonCreateRequest baseCreateRequest(JsonNode questionnaire) {
        return new HackathonCreateRequest(
                "Test Hackathon",
                "Description",
                "Tallinn",
                LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(2),
                false,
                true,
                null
        );
    }

    private HackathonUpdateRequest baseUpdateRequest(LocalDateTime start, LocalDateTime end, HackathonStatus status) {
        return new HackathonUpdateRequest(
                "Updated Name",
                "Updated Description",
                "Tartu",
                start,
                end,
                status
        );
    }

    private Hackathon existingHackathon(HackathonStatus status) {
        Hackathon h = new Hackathon();
        h.setId(1L);
        h.setName("Existing");
        h.setDescription("Existing desc");
        h.setLocation("Tallinn");
        h.setStartDate(LocalDateTime.now().plusDays(1));
        h.setEndDate(LocalDateTime.now().plusDays(2));
        h.setStatus(status);
        h.setCreatedAt(Instant.now());
        h.setUpdatedAt(Instant.now());
        return h;
    }


    @Test
    void createHackathon_allGood_withNullQuestionnaire_shouldSucceed() {
        HackathonCreateRequest request = baseCreateRequest(null);

        when(hackathonRepository.save(ArgumentMatchers.any(Hackathon.class)))
                .thenAnswer(invocation -> {
                    Hackathon h = invocation.getArgument(0);
                    h.setId(1L);
                    return h;
                });

        Hackathon created = hackathonService.createHackathon(request, any());

        assertNotNull(created.getId());
        assertEquals("Test Hackathon", created.getName());
    }

    @Test
    @Disabled("Skipping temporarily while implementing questionnaire logic")
    void createHackathon_questionnaireWithoutQuestionsArray_shouldFail() throws Exception {
        JsonNode badQuestionnaire = objectMapper.readTree("""
            {
              "foo": "bar"
            }
            """);

        HackathonCreateRequest request = baseCreateRequest(badQuestionnaire);

        HackathonValidationException ex = assertThrows(
                HackathonValidationException.class,
                () -> hackathonService.createHackathon(request, any())
        );

        assertTrue(ex.getMessage().contains("must contain a 'questions' array"));
    }

    @Test
    @Disabled("Skipping temporarily while implementing questionnaire logic")
    void createHackathon_questionnaireNotObject_shouldFail() throws Exception {
        JsonNode badQuestionnaire = objectMapper.readTree("""
            [
              { "id": "q1", "type": "text" }
            ]
            """);

        HackathonCreateRequest request = baseCreateRequest(badQuestionnaire);

        HackathonValidationException ex = assertThrows(
                HackathonValidationException.class,
                () -> hackathonService.createHackathon(request, any())
        );

        assertTrue(ex.getMessage().contains("Questionnaire must be a JSON object"));
    }

    @Test
    @Disabled("Skipping temporarily while implementing questionnaire logic")
    void createHackathon_validQuestionnaire_shouldSucceed() throws Exception {
        JsonNode questionnaire = objectMapper.readTree("""
            {
              "questions": [
                {
                  "id": "q1",
                  "type": "text",
                  "label": "Main skill",
                  "required": true
                },
                {
                  "id": "q2",
                  "type": "select",
                  "label": "Focus area",
                  "required": false,
                  "options": ["AI", "Health", "Finance"]
                }
              ]
            }
            """);

        HackathonCreateRequest request = baseCreateRequest(questionnaire);

        when(hackathonRepository.save(ArgumentMatchers.any(Hackathon.class)))
                .thenAnswer(invocation -> {
                    Hackathon h = invocation.getArgument(0);
                    h.setId(42L);
                    return h;
                });

        Hackathon created = hackathonService.createHackathon(request, any());

        assertEquals(42L, created.getId());
        assertNotNull(created.getQuestionnaire());
    }


    @Test
    void createHackathon_startAfterEnd_shouldFail() {
        HackathonCreateRequest request = new HackathonCreateRequest(
                "Test",
                "Desc",
                "Tallinn",
                LocalDateTime.now().plusDays(5),
                LocalDateTime.now().plusDays(1),
                false,
                true,
                null
        );

        HackathonValidationException ex = assertThrows(
                HackathonValidationException.class,
                () -> hackathonService.createHackathon(request, any())
        );

        assertTrue(ex.getMessage().contains("Start date cannot be after end date"));
    }

    // ---------- UPDATE: status/date rules ----------

    @Test
    void updateHackathon_toOpenWithStartInPast_shouldFail() {
        Hackathon existing = existingHackathon(HackathonStatus.DRAFT);

        when(hackathonRepository.findById(1L)).thenReturn(Optional.of(existing));

        HackathonUpdateRequest request = baseUpdateRequest(
                LocalDateTime.now().minusDays(1),
                LocalDateTime.now().plusDays(1),
                HackathonStatus.OPEN
        );

        HackathonValidationException ex = assertThrows(
                HackathonValidationException.class,
                () -> hackathonService.updateHackathon(1L, request)
        );

        assertTrue(ex.getMessage().contains("status OPEN"));
    }

    @Test
    void updateHackathon_toFinishedWithEndInFuture_shouldFail() {
        Hackathon existing = existingHackathon(HackathonStatus.OPEN);

        when(hackathonRepository.findById(1L)).thenReturn(Optional.of(existing));

        HackathonUpdateRequest request = baseUpdateRequest(
                LocalDateTime.now().minusDays(3),
                LocalDateTime.now().plusDays(3),
                HackathonStatus.FINISHED
        );

        HackathonValidationException ex = assertThrows(
                HackathonValidationException.class,
                () -> hackathonService.updateHackathon(1L, request)
        );

        assertTrue(ex.getMessage().contains("FINISHED cannot have an end date in the future"));
    }

    @Test
    void updateHackathon_finishedToDraft_shouldFail() {
        Hackathon existing = existingHackathon(HackathonStatus.FINISHED);

        when(hackathonRepository.findById(1L)).thenReturn(Optional.of(existing));

        HackathonUpdateRequest request = baseUpdateRequest(
                LocalDateTime.now().minusDays(3),
                LocalDateTime.now().minusDays(1),
                HackathonStatus.DRAFT
        );

        HackathonValidationException ex = assertThrows(
                HackathonValidationException.class,
                () -> hackathonService.updateHackathon(1L, request)
        );

        assertTrue(ex.getMessage().contains("Finished hackathons cannot change status"));
    }

    @Test
    void updateHackathon_validUpdate_shouldSucceed() {
        Hackathon existing = existingHackathon(HackathonStatus.DRAFT);

        when(hackathonRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(hackathonRepository.save(ArgumentMatchers.any(Hackathon.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        HackathonUpdateRequest request = baseUpdateRequest(
                LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(3),
                HackathonStatus.OPEN
        );

        Hackathon updated = hackathonService.updateHackathon(1L, request);

        assertEquals("Updated Name", updated.getName());
        assertEquals(HackathonStatus.OPEN, updated.getStatus());
    }
}
