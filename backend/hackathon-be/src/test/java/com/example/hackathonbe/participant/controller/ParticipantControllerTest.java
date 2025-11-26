package com.example.hackathonbe.participant.controller;

import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.participant.dto.ParticipantInfoResponse;
import com.example.hackathonbe.participant.dto.ParticipantUpdateRequest;
import com.example.hackathonbe.participant.service.ParticipantService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ParticipantController.class)
@AutoConfigureMockMvc(addFilters = false)
class ParticipantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ParticipantService participantService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getAllParticipants_returnsListOfDtos() throws Exception {
        Long hackathonId = 1L;

        ParticipantDto dto1 = new ParticipantDto();
        dto1.setId(10L);
        dto1.setEmail("john@example.com");
        dto1.setFirstName("John");
        dto1.setLastName("Doe");

        ParticipantDto dto2 = new ParticipantDto();
        dto2.setId(11L);
        dto2.setEmail("jane@example.com");
        dto2.setFirstName("Jane");
        dto2.setLastName("Smith");

        when(participantService.getAllParticipants(hackathonId))
                .thenReturn(List.of(dto1, dto2));

        mockMvc.perform(get("/api/{hackathonId}/participants/all", hackathonId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(10L))
                .andExpect(jsonPath("$[0].email").value("john@example.com"))
                .andExpect(jsonPath("$[1].id").value(11L))
                .andExpect(jsonPath("$[1].email").value("jane@example.com"));

        verify(participantService).getAllParticipants(hackathonId);
    }

    @Test
    void getParticipantById_returnsInfoResponse() throws Exception {
        Long hackathonId = 1L;
        Long participantId = 10L;

        ParticipantInfoResponse response = new ParticipantInfoResponse(
                participantId,
                "john@example.com",
                "John",
                "Doe"
        );

        when(participantService.getParticipantById(participantId, hackathonId))
                .thenReturn(response);

        mockMvc.perform(get("/api/{hackathonId}/participants/{id}", hackathonId, participantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(participantId))
                .andExpect(jsonPath("$.email").value("john@example.com"))
                .andExpect(jsonPath("$.firstName").value("John"))
                .andExpect(jsonPath("$.lastName").value("Doe"));

        verify(participantService).getParticipantById(participantId, hackathonId);
    }

    @Test
    void updateParticipant_updatesAndReturnsInfoResponse() throws Exception {
        Long hackathonId = 1L;
        Long participantId = 10L;

        ParticipantUpdateRequest request = new ParticipantUpdateRequest(
                34L,
                "NewFirst",
                "NewLast",
                "new@example.com"
        );

        ParticipantInfoResponse response = new ParticipantInfoResponse(
                participantId,
                "new@example.com",
                "NewFirst",
                "NewLast"
        );

        when(participantService.updateParticipant(eq(hackathonId), eq(participantId), any(ParticipantUpdateRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put("/api/{hackathonId}/participants/{participantId}", hackathonId, participantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(participantId))
                .andExpect(jsonPath("$.email").value("new@example.com"))
                .andExpect(jsonPath("$.firstName").value("NewFirst"))
                .andExpect(jsonPath("$.lastName").value("NewLast"));

        verify(participantService).updateParticipant(eq(hackathonId), eq(participantId), any(ParticipantUpdateRequest.class));
    }

    @Test
    void deleteParticipant_returnsOkAndDelegatesToService() throws Exception {
        Long hackathonId = 1L;
        Long participantId = 10L;

        mockMvc.perform(delete("/api/{hackathonId}/participants/{participantId}", hackathonId, participantId))
                .andExpect(status().isOk());

        verify(participantService).deleteParticipant(participantId, hackathonId);
    }

    @Test
    void updateParticipant_whenOptimisticLockingFailure_returnsEditConflict409() throws Exception {
        Long hackathonId = 1L;
        Long participantId = 10L;

        ParticipantUpdateRequest request = new ParticipantUpdateRequest(
                34L,
                "NewFirst",
                "NewLast",
                "new@example.com"
        );

        when(participantService.updateParticipant(eq(hackathonId), eq(participantId), any(ParticipantUpdateRequest.class)))
                .thenThrow(new OptimisticLockingFailureException("conflict"));

        mockMvc.perform(put("/api/{hackathonId}/participants/{participantId}", hackathonId, participantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EDIT_CONFLICT"))
                .andExpect(jsonPath("$.message", not(emptyString())));
    }

    @Test
    void updateParticipant_whenValidationFails_returnsValidationError400() throws Exception {
        Long hackathonId = 1L;
        Long participantId = 10L;

        // Assuming at least one of the fields is @NotBlank/@Email, this should trigger validation
        Map<String, Object> invalidRequest = Map.of(
                "firstName", "",
                "lastName", "",
                "email", "not-an-email"
        );

        mockMvc.perform(put("/api/{hackathonId}/participants/{participantId}", hackathonId, participantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors").isMap());
    }
}
