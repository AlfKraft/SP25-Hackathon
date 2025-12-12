package com.example.hackathonbe.participant.service;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.participant.dto.ParticipantInfoResponse;
import com.example.hackathonbe.participant.dto.ParticipantUpdateRequest;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParticipantService {

    private final ParticipantRepository participantRepository;
    private final HackathonRepository hackathonRepository;

    public List<ParticipantDto> getAllParticipants(Long hackathonId) {
        Hackathon hackathon = hackathonRepository.getReferenceById(hackathonId);
        return hackathon.getParticipants().stream().map(participant -> {
            return new ParticipantDto(participant.getId(), participant.getFirstName(), participant.getLastName(), participant.getEmail());
        }).toList();
    }


    public ParticipantInfoResponse updateParticipant(Long hackathonId, Long participantId ,@Valid ParticipantUpdateRequest request) {
        Hackathon hackathon = hackathonRepository.getReferenceById(hackathonId);
        Participant participant = hackathon.getParticipants().stream().filter(p -> p.getId().equals(participantId)).findFirst().orElseThrow();
        participant.setFirstName(request.firstName());
        participant.setLastName(request.lastName());
        participant.setEmail(request.email());
        Participant updatedParticipant = participantRepository.save(participant);
        return new ParticipantInfoResponse(
                updatedParticipant.getId(), updatedParticipant.getEmail(), updatedParticipant.getFirstName(), updatedParticipant.getLastName());
    }

    public ParticipantInfoResponse getParticipantById(Long id, Long hackathonId) {
        Hackathon hackathon = hackathonRepository.getReferenceById(hackathonId);
        Participant participant = hackathon.getParticipants().stream().filter(p -> p.getId().equals(id)).findFirst().orElseThrow();
        return new ParticipantInfoResponse(
                participant.getId(),
                participant.getEmail(),
                participant.getFirstName(),
                participant.getLastName()
        );
    }

    public void deleteParticipant (Long id, Long hackathonId) {
        Hackathon hackathon = hackathonRepository.getReferenceById(hackathonId);
        Participant participant = hackathon.getParticipants().stream().filter(p -> p.getId().equals(id)).findFirst().orElseThrow();
        hackathon.getParticipants().remove(participant);
        hackathonRepository.save(hackathon);
    }
}
