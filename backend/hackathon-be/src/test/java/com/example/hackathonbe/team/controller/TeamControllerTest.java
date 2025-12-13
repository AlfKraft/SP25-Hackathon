package com.example.hackathonbe.team.controller;

import com.example.hackathonbe.auth.security.JwtAuthenticationFilter;
import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.team.dto.TeamDTO;
import com.example.hackathonbe.team.dto.TeamEditRequests.AddMembersRequest;
import com.example.hackathonbe.team.dto.TeamEditRequests.MoveMemberRequest;
import com.example.hackathonbe.team.dto.TeamEditRequests.UpdateTeamNameRequest;
import com.example.hackathonbe.team.dto.TeamMemberDTO;
import com.example.hackathonbe.team.service.TeamService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Lightweight MVC tests for TeamController endpoints.
 */
@AutoConfigureMockMvc(addFilters = false)
@WebMvcTest(controllers = TeamController.class)
class TeamControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TeamService teamService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void getTeams_returnsListFromService() throws Exception {
        UUID generationId = UUID.randomUUID();
        Long hackathonId = 1L;
        TeamDTO dto = new TeamDTO(
                UUID.randomUUID(),
                "Team A",
                10.0,
                generationId,
                OffsetDateTime.now(),
                List.of(new TeamMemberDTO(new ParticipantDto(10L,  "John", "Doe", "john@example.com"), "Dev", "Java", 5, 3))
        );

        when(teamService.getTeams(hackathonId)).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/1/teams")
                        .param("generationId", generationId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Team A"));

        verify(teamService).getTeams(hackathonId);
    }

    @Test
    void renameTeam_callsServiceWithCorrectArguments() throws Exception {
        UUID teamId = UUID.randomUUID();
        UpdateTeamNameRequest request = new UpdateTeamNameRequest("Renamed");
        TeamDTO dto = new TeamDTO(
                teamId,
                "Renamed",
                10.0,
                UUID.randomUUID(),
                OffsetDateTime.now(),
                Collections.emptyList()
        );

        when(teamService.renameTeam(eq(teamId), any())).thenReturn(dto);

        mockMvc.perform(patch("/api/3/teams/{teamId}", teamId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed"));

        verify(teamService).renameTeam(eq(teamId), any(UpdateTeamNameRequest.class));
    }

    @Test
    void addMembers_callsServiceAndReturnsUpdatedTeam() throws Exception {
        UUID teamId = UUID.randomUUID();
        AddMembersRequest request = new AddMembersRequest(List.of(1L, 2L));

        TeamDTO dto = new TeamDTO(
                teamId,
                "Team",
                10.0,
                UUID.randomUUID(),
                OffsetDateTime.now(),
                List.of(new TeamMemberDTO(new ParticipantDto(10L,  "John", "Doe", "john@example.com"), "Dev", "Java", 5, 3))
        );

        when(teamService.addMembers(eq(teamId), any())).thenReturn(dto);

        mockMvc.perform(post("/api/3/teams/{teamId}/members", teamId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[0].participant.id").value(10L));

        verify(teamService).addMembers(eq(teamId), any(AddMembersRequest.class));
    }

    @Test
    void removeMember_callsServiceAndReturnsUpdatedTeam() throws Exception {
        UUID teamId = UUID.randomUUID();
        long participantId = 42L;

        TeamDTO dto = new TeamDTO(
                teamId,
                "Team",
                10.0,
                UUID.randomUUID(),
                OffsetDateTime.now(),
                Collections.emptyList()
        );

        when(teamService.removeMember(teamId, participantId)).thenReturn(dto);

        mockMvc.perform(delete("/api/3/teams/{teamId}/members/{participantId}", teamId, participantId))
                .andExpect(status().isOk());

        verify(teamService).removeMember(teamId, participantId);
    }

    @Test
    void moveMember_callsService() throws Exception {
        MoveMemberRequest request = new MoveMemberRequest(
                UUID.randomUUID(),
                123L,
                UUID.randomUUID()
        );

        mockMvc.perform(post("/api/3/teams/move-member")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(teamService).moveMember(Mockito.any(MoveMemberRequest.class));
    }
}
