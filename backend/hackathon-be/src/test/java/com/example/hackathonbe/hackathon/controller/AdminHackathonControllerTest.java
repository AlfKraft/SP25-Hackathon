package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.dto.HackathonAdminResponse;
import com.example.hackathonbe.hackathon.dto.HackathonCreateRequest;
import com.example.hackathonbe.hackathon.dto.HackathonUpdateRequest;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import com.example.hackathonbe.hackathon.service.AdminHackathonService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AdminHackathonController.
 */
@ExtendWith(MockitoExtension.class)
class AdminHackathonControllerTest {

    @Mock
    private AdminHackathonService hackathonService;

    @InjectMocks
    private AdminHackathonController controller;

    @Test
    void create_returns201WithLocationAndBody() {
        // given
        HackathonCreateRequest request = new HackathonCreateRequest(
                "New Hack",
                "Desc",
                "Tartu",
                LocalDateTime.of(2025, 1, 10, 9, 0),
                LocalDateTime.of(2025, 1, 12, 18, 0),
                false,
                true,
                null,
                null
        );
        Hackathon created = sampleHackathon(1L, "New Hack", HackathonStatus.DRAFT);
        when(hackathonService.createHackathon(request)).thenReturn(created);

        // when
        ResponseEntity<HackathonAdminResponse> response = controller.create(request);

        // then
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(URI.create("/api/admin/hackathons/1"), response.getHeaders().getLocation());
        assertEquals(HackathonAdminResponse.fromEntity(created), response.getBody());
        verify(hackathonService).createHackathon(request);
    }

    @Test
    void update_returns200WithUpdatedBody() {
        // given
        HackathonUpdateRequest request = new HackathonUpdateRequest(
                "Updated Hack",
                "Updated desc",
                "Tallinn",
                LocalDateTime.of(2025, 1, 11, 9, 0),
                LocalDateTime.of(2025, 1, 13, 18, 0),
                HackathonStatus.OPEN
        );
        Hackathon updated = sampleHackathon(5L, "Updated Hack", HackathonStatus.OPEN);
        when(hackathonService.updateHackathon(5L, request)).thenReturn(updated);

        // when
        ResponseEntity<HackathonAdminResponse> response = controller.update(5L, request);

        // then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(HackathonAdminResponse.fromEntity(updated), response.getBody());
        verify(hackathonService).updateHackathon(5L, request);
    }

    @Test
    void list_returns200WithMappedResponses() {
        // given
        Hackathon h1 = sampleHackathon(1L, "Hack 1", HackathonStatus.OPEN);
        Hackathon h2 = sampleHackathon(2L, "Hack 2", HackathonStatus.CLOSED);
        when(hackathonService.listHackathons()).thenReturn(List.of(h1, h2));

        // when
        ResponseEntity<List<HackathonAdminResponse>> response = controller.list();

        // then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<HackathonAdminResponse> body = response.getBody();
        assertNotNull(body);
        assertEquals(2, body.size());
        assertEquals(HackathonAdminResponse.fromEntity(h1), body.get(0));
        assertEquals(HackathonAdminResponse.fromEntity(h2), body.get(1));

        verify(hackathonService).listHackathons();
    }

    @Test
    void getById_whenFound_returns200() {
        // given
        Hackathon h = sampleHackathon(10L, "Some Hack", HackathonStatus.OPEN);
        when(hackathonService.getById(10L)).thenReturn(Optional.of(h));

        // when
        ResponseEntity<HackathonAdminResponse> response = controller.getById(10L);

        // then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(HackathonAdminResponse.fromEntity(h), response.getBody());
        verify(hackathonService).getById(10L);
    }

    @Test
    void getById_whenNotFound_returns404() {
        // given
        when(hackathonService.getById(99L)).thenReturn(Optional.empty());

        // when
        ResponseEntity<HackathonAdminResponse> response = controller.getById(99L);

        // then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
        verify(hackathonService).getById(99L);
    }

    @Test
    void delete_callsServiceAndReturnsNoContent() {
        // when
        controller.delete(7L);

        // then
        verify(hackathonService).deleteById(7L);
        // method is void and annotated with @ResponseStatus(NO_CONTENT),
        // so there is no ResponseEntity to assert on here.
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
