package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.dto.HackathonResponse;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import com.example.hackathonbe.hackathon.service.HackathonService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * HTTP-level tests for public HackathonController.
 */
@WebMvcTest(HackathonController.class)
@AutoConfigureMockMvc(addFilters = false)
class HackathonControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    HackathonService hackathonService;

    @Test
    void listVisibleHackathons_returns200AndArray() throws Exception {
        HackathonResponse r1 = sampleResponse(1L, "Hack 1");
        HackathonResponse r2 = sampleResponse(2L, "Hack 2");

        when(hackathonService.getOpenHackathons()).thenReturn(List.of(r1, r2));

        mockMvc.perform(get("/api/hackathons")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].name").value("Hack 1"))
                .andExpect(jsonPath("$[1].id").value(2L))
                .andExpect(jsonPath("$[1].name").value("Hack 2"));

        verify(hackathonService).getOpenHackathons();
    }

    private HackathonResponse sampleResponse(Long id, String name) {
        return new HackathonResponse(
                id,
                name,
                "Some description",
                "Tartu",
                LocalDateTime.of(2025, 1, 10, 9, 0),
                LocalDateTime.of(2025, 1, 12, 18, 0),
                HackathonStatus.OPEN
        );
    }
}
