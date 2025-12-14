package com.example.hackathonbe.participant.service;

import com.example.hackathonbe.common.exceptions.NotFoundException;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.participant.dto.ParticipantInfoResponse;
import com.example.hackathonbe.participant.dto.ParticipantUpdateRequest;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParticipantServiceTest {

    @Mock
    private ParticipantRepository participantRepository;

    @Mock
    private HackathonRepository hackathonRepository;

    @InjectMocks
    private ParticipantService participantService;

    @Test
    void getAllParticipants_returnsMappedDtosForHackathonParticipants() {
        Long hackathonId = 1L;

        Hackathon hackathon = buildHackathonWithTwoParticipants();

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));

        List<ParticipantDto> result = participantService.getAllParticipants(hackathonId);

        assertThat(result).hasSize(2);
        result.forEach(dto -> assertThat(dto.id()).isIn(10L, 11L));

        verify(hackathonRepository).findById(hackathonId);
        verifyNoInteractions(participantRepository);
    }

    @Test
    void getAllParticipants_throwsNotFound_whenHackathonMissing() {
        Long hackathonId = 1L;

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> participantService.getAllParticipants(hackathonId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Hackathon not found");

        verify(hackathonRepository).findById(hackathonId);
        verifyNoInteractions(participantRepository);
    }

    @Test
    void getParticipantById_returnsParticipantInfoResponse_whenParticipantBelongsToHackathon() {
        Long hackathonId = 1L;
        Long participantId = 10L;

        Participant participant = new Participant();
        participant.setId(participantId);
        participant.setEmail("john@example.com");
        participant.setFirstName("John");
        participant.setLastName("Doe");

        Hackathon hackathon = new Hackathon();
        hackathon.setParticipants(new HashSet<>(List.of(participant)));

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));

        ParticipantInfoResponse response = participantService.getParticipantById(participantId, hackathonId);

        assertThat(response.id()).isEqualTo(participantId);
        assertThat(response.email()).isEqualTo("john@example.com");
        assertThat(response.firstName()).isEqualTo("John");
        assertThat(response.lastName()).isEqualTo("Doe");

        verify(hackathonRepository).findById(hackathonId);
        verifyNoInteractions(participantRepository);
    }

    @Test
    void getParticipantById_throwsNotFound_whenParticipantNotFoundInHackathon() {
        Long hackathonId = 1L;
        Long participantId = 999L;

        Hackathon hackathon = new Hackathon();
        hackathon.setParticipants(new HashSet<>());

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));

        assertThatThrownBy(() -> participantService.getParticipantById(participantId, hackathonId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Participant 999 not found in hackathon null");

        verify(hackathonRepository).findById(hackathonId);
        verifyNoInteractions(participantRepository);
    }

    @Test
    void updateParticipant_updatesEntityAndReturnsUpdatedInfoResponse() {
        Long hackathonId = 1L;
        Long participantId = 10L;

        Participant existing = new Participant();
        existing.setId(participantId);
        existing.setEmail("old@example.com");
        existing.setFirstName("Old");
        existing.setLastName("Name");

        Hackathon hackathon = new Hackathon();
        hackathon.setParticipants(new HashSet<>(List.of(existing)));

        ParticipantUpdateRequest request = new ParticipantUpdateRequest(
                34L,
                "NewFirst",
                "NewLast",
                "new@example.com"
        );

        Participant saved = new Participant();
        saved.setId(participantId);
        saved.setEmail("new@example.com");
        saved.setFirstName("NewFirst");
        saved.setLastName("NewLast");

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));
        when(participantRepository.save(existing)).thenReturn(saved);

        ParticipantInfoResponse response = participantService.updateParticipant(hackathonId, participantId, request);

        assertThat(existing.getFirstName()).isEqualTo("NewFirst");
        assertThat(existing.getLastName()).isEqualTo("NewLast");
        assertThat(existing.getEmail()).isEqualTo("new@example.com");

        assertThat(response.id()).isEqualTo(participantId);
        assertThat(response.email()).isEqualTo("new@example.com");
        assertThat(response.firstName()).isEqualTo("NewFirst");
        assertThat(response.lastName()).isEqualTo("NewLast");

        verify(hackathonRepository).findById(hackathonId);
        verify(participantRepository).save(existing);
    }

    @Test
    void updateParticipant_throwsNotFound_whenParticipantNotFoundInHackathon() {
        Long hackathonId = 1L;
        Long participantId = 999L;

        Hackathon hackathon = new Hackathon();
        hackathon.setParticipants(new HashSet<>());

        ParticipantUpdateRequest request = new ParticipantUpdateRequest(
                34L,
                "First",
                "Last",
                "test@example.com"
        );

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));

        assertThatThrownBy(() -> participantService.updateParticipant(hackathonId, participantId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Participant 999 not found in hackathon null");

        verify(hackathonRepository).findById(hackathonId);
        verify(participantRepository, never()).save(any());
    }

    @Test
    void deleteParticipant_removesParticipantFromHackathonList() {
        Long hackathonId = 1L;
        Long participantId = 10L;

        Participant participant = new Participant();
        participant.setId(participantId);

        Hackathon hackathon = new Hackathon();
        hackathon.setParticipants(new HashSet<>(List.of(participant)));

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));
        when(hackathonRepository.save(any(Hackathon.class))).thenAnswer(inv -> inv.getArgument(0));

        participantService.deleteParticipant(participantId, hackathonId);

        assertThat(hackathon.getParticipants()).isEmpty();

        verify(hackathonRepository).findById(hackathonId);
        verify(hackathonRepository).save(hackathon);
        verifyNoInteractions(participantRepository);
    }

    private static Hackathon buildHackathonWithTwoParticipants() {
        Participant participant1 = new Participant();
        participant1.setId(10L);
        participant1.setEmail("john@example.com");
        participant1.setFirstName("John");
        participant1.setLastName("Doe");

        Participant participant2 = new Participant();
        participant2.setId(11L);
        participant2.setEmail("jane@example.com");
        participant2.setFirstName("Jane");
        participant2.setLastName("Smith");

        Hackathon hackathon = new Hackathon();
        hackathon.setParticipants(new HashSet<>(List.of(participant1, participant2)));
        return hackathon;
    }
}
