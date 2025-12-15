package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.common.exceptions.NotFoundException;
import com.example.hackathonbe.hackathon.dto.HackathonResponse;
import com.example.hackathonbe.hackathon.model.*;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Tests for HackathonService.
 */
@ExtendWith(MockitoExtension.class)
class HackathonServiceTest {

    @Mock
    private HackathonRepository repository;

    @InjectMocks
    private HackathonService service;

    @Test
    void getOpenHackathons_returnsOnlyOpenHackathonsMappedToResponses() {
        // given
        Hackathon h1 = createHackathon(1L, "Hack 1", HackathonStatus.OPEN);
        Hackathon h2 = createHackathon(2L, "Hack 2", HackathonStatus.OPEN);
        when(repository.findByStatus(HackathonStatus.OPEN))
                .thenReturn(List.of(h1, h2));

        // when
        List<HackathonResponse> result = service.getOpenHackathons();

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).name()).isEqualTo("Hack 1");
        assertThat(result.get(0).status()).isEqualTo(HackathonStatus.OPEN);

        assertThat(result.get(1).id()).isEqualTo(2L);
        assertThat(result.get(1).name()).isEqualTo("Hack 2");
        assertThat(result.get(1).status()).isEqualTo(HackathonStatus.OPEN);

        // also verify correct status filter used
        ArgumentCaptor<HackathonStatus> statusCaptor = ArgumentCaptor.forClass(HackathonStatus.class);
        verify(repository).findByStatus(statusCaptor.capture());
        assertThat(statusCaptor.getValue()).isEqualTo(HackathonStatus.OPEN);
    }

    @Test
    void getHackathonById_whenOpen_returnsMappedResponse() {
        // given
        Hackathon entity = createHackathon(10L, "Open Hack", HackathonStatus.OPEN);
        when(repository.findById(10L)).thenReturn(Optional.of(entity));

        // when
        HackathonResponse result = service.getHackathonById(10L);

        // then
        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.name()).isEqualTo("Open Hack");
        assertThat(result.description()).isEqualTo("Some description");
        assertThat(result.location()).isEqualTo("Tartu");
        assertThat(result.startDate()).isEqualTo(entity.getStartDate());
        assertThat(result.endDate()).isEqualTo(entity.getEndDate());
        assertThat(result.status()).isEqualTo(HackathonStatus.OPEN);
    }

    @Test
    void getHackathonById_whenNotFound_throwsIllegalArgumentException() {
        // given
        when(repository.findById(99L)).thenReturn(Optional.empty());

        // expect
        assertThatThrownBy(() -> service.getHackathonById(99L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Hackathon not found: 99");
    }

    @Test
    void getHackathonById_whenNotOpen_throwsIllegalArgumentException() {
        // given
        Hackathon entity = createHackathon(5L, "Closed Hack", HackathonStatus.ARCHIVED);
        when(repository.findById(5L)).thenReturn(Optional.of(entity));

        // expect
        assertThatThrownBy(() -> service.getHackathonById(5L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Hackathon is not open: 5");
    }

    private Hackathon createHackathon(Long id, String name, HackathonStatus status) {
        Questionnaire q = new Questionnaire();
        q.setId(1L);
        q.setSource(QuestionnaireSource.INTERNAL);
        q.setStatus(QuestionnaireStatus.PUBLISHED);
        Hackathon h = new Hackathon();
        h.setId(id);
        h.setName(name);
        h.setDescription("Some description");
        h.setLocation("Tartu");
        h.setStatus(status);
        h.setStartDate(LocalDateTime.now().plusDays(1));
        h.setEndDate(LocalDateTime.now().plusDays(7));
        h.setQuestionnaire(q);
        return h;
    }
}
