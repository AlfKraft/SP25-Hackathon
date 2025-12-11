package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.dto.HackathonAdminResponse;
import com.example.hackathonbe.hackathon.dto.HackathonCreateRequest;
import com.example.hackathonbe.hackathon.dto.HackathonUpdateRequest;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import com.example.hackathonbe.hackathon.service.AdminHackathonService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Real HTTP-level tests for AdminHackathonController.
 */
@WebMvcTest(AdminHackathonController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminHackathonControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    AdminHackathonService hackathonService;

    @Test
    void create_returns201WithLocationAndBody() throws Exception {
        HackathonCreateRequest request = new HackathonCreateRequest(
                "New Hack",
                "Description",
                "Tartu",
                LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(2),
                false,
                true,
                null
        );

        Hackathon created = sampleHackathon(1L, "New Hack", HackathonStatus.DRAFT);
        when(hackathonService.createHackathon(any(HackathonCreateRequest.class), any())).thenReturn(created);

        mockMvc.perform(post("/api/admin/hackathons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", URI.create("/api/admin/hackathons/1").toString()))
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("New Hack"));

        verify(hackathonService).createHackathon(request, any());
    }

    @Test
    void update_returns200WithUpdatedBody() throws Exception {
        Long id = 5L;
        HackathonUpdateRequest request = new HackathonUpdateRequest(
                "Updated Hack",
                "Updated desc",
                "Tallinn",
                LocalDateTime.of(2025, 1, 11, 9, 0),
                LocalDateTime.of(2025, 1, 13, 18, 0),
                HackathonStatus.OPEN
        );

        Hackathon updated = sampleHackathon(id, "Updated Hack", HackathonStatus.OPEN);
        when(hackathonService.updateHackathon(eq(id), any(HackathonUpdateRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/admin/hackathons/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("Updated Hack"))
                .andExpect(jsonPath("$.status").value("OPEN"));

        verify(hackathonService).updateHackathon(id, request);
    }

    @Test
    void list_returns200WithArrayBody() throws Exception {
        Hackathon h1 = sampleHackathon(1L, "Hack 1", HackathonStatus.OPEN);
        Hackathon h2 = sampleHackathon(2L, "Hack 2", HackathonStatus.DRAFT);
        when(hackathonService.listHackathonsByOrganizer(any())).thenReturn(List.of(h1, h2));

        mockMvc.perform(get("/api/admin/hackathons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].name").value("Hack 1"))
                .andExpect(jsonPath("$[1].id").value(2L))
                .andExpect(jsonPath("$[1].name").value("Hack 2"));

        verify(hackathonService).listHackathonsByOrganizer(any());
    }

    @Test
    void getById_whenFound_returns200() throws Exception {
        Long id = 10L;
        Hackathon h = sampleHackathon(id, "Some Hack", HackathonStatus.OPEN);
        when(hackathonService.getById(id)).thenReturn(Optional.of(h));

        mockMvc.perform(get("/api/admin/hackathons/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("Some Hack"));

        verify(hackathonService).getById(id);
    }

    @Test
    void getById_whenNotFound_returns404() throws Exception {
        Long id = 99L;
        when(hackathonService.getById(id)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/hackathons/{id}", id))
                .andExpect(status().isNotFound());

        verify(hackathonService).getById(id);
    }

    @Test
    void delete_callsServiceAndReturns204() throws Exception {
        Long id = 7L;

        mockMvc.perform(delete("/api/admin/hackathons/{id}", id))
                .andExpect(status().isNoContent());

        verify(hackathonService).deleteById(id);
    }

    private Hackathon sampleHackathon(Long id, String name, HackathonStatus status) {
        Hackathon h = new Hackathon();
        h.setId(id);
        h.setName(name);
        h.setDescription("Some description");
        h.setLocation("Somewhere");
        h.setStatus(status);
        h.setStartDate(LocalDateTime.of(2025, 1, 10, 9, 0));
        h.setEndDate(LocalDateTime.of(2025, 1, 12, 18, 0));
        return h;
    }
}
