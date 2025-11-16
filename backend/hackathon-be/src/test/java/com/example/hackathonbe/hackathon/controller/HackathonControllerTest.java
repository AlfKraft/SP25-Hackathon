package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.dto.HackathonResponse;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import com.example.hackathonbe.hackathon.service.HackathonService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for HackathonController (public endpoints).
 */
@ExtendWith(MockitoExtension.class)
class HackathonControllerTest {

    @Mock
    private HackathonService service;

    @InjectMocks
    private HackathonController controller;

    @Test
    void getOpenHackathons_returns200WithBodyFromService() {
        // given
        HackathonResponse r1 = sampleResponse(1L, "Hack 1");
        HackathonResponse r2 = sampleResponse(2L, "Hack 2");
        when(service.getOpenHackathons()).thenReturn(List.of(r1, r2));

        // when
        ResponseEntity<List<HackathonResponse>> response = controller.getOpenHackathons();

        // then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<HackathonResponse> body = response.getBody();
        assertNotNull(body);
        assertEquals(2, body.size());
        assertEquals(r1, body.get(0));
        assertEquals(r2, body.get(1));

        verify(service).getOpenHackathons();
    }

    @Test
    void getHackathonById_returns200WithBodyFromService() {
        // given
        HackathonResponse expected = sampleResponse(10L, "Open Hack");
        when(service.getHackathonById(10L)).thenReturn(expected);

        // when
        ResponseEntity<HackathonResponse> response = controller.getHackathonById(10L);

        // then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
        verify(service).getHackathonById(10L);
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
