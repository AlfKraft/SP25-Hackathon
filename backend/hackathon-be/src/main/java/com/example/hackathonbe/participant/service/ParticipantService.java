package com.example.hackathonbe.participant.service;

import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.common.exceptions.ConflictException;
import com.example.hackathonbe.common.exceptions.NotFoundException;
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
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParticipantService {

    private final ParticipantRepository participantRepository;
    private final HackathonRepository hackathonRepository;

    @Transactional(readOnly = true)
    public List<ParticipantDto> getAllParticipants(Long hackathonId) {
        Hackathon hackathon = findHackathonOrThrow(hackathonId);

        return hackathon.getParticipants().stream()
                .map(p -> new ParticipantDto(p.getId(), p.getFirstName(), p.getLastName(), p.getEmail()))
                .toList();
    }

    @Transactional
    public ParticipantInfoResponse updateParticipant(Long hackathonId, Long participantId, @Valid ParticipantUpdateRequest request) {
        if (participantId == null || participantId <= 0) {
            throw new BadRequestException("Invalid participant id");
        }

        Hackathon hackathon = findHackathonOrThrow(hackathonId);
        Participant participant = findParticipantInHackathonOrThrow(hackathon, participantId);

        String newEmail = safeLower(request.email());
        if (newEmail.isBlank()) {
            throw new BadRequestException("Email is required");
        }

        // Avoid “stealing” someone else’s email
        if (!newEmail.equalsIgnoreCase(participant.getEmail()) && participantRepository.existsByEmail(newEmail)) {
            throw new ConflictException("Email already in use: " + newEmail);
        }

        participant.setFirstName(trimOrNull(request.firstName()));
        participant.setLastName(trimOrNull(request.lastName()));
        participant.setEmail(newEmail);

        Participant updated = participantRepository.save(participant);

        return new ParticipantInfoResponse(
                updated.getId(),
                updated.getEmail(),
                updated.getFirstName(),
                updated.getLastName()
        );
    }

    @Transactional(readOnly = true)
    public ParticipantInfoResponse getParticipantById(Long participantId, Long hackathonId) {
        if (participantId == null || participantId <= 0) {
            throw new BadRequestException("Invalid participant id");
        }

        Hackathon hackathon = findHackathonOrThrow(hackathonId);
        Participant participant = findParticipantInHackathonOrThrow(hackathon, participantId);

        return new ParticipantInfoResponse(
                participant.getId(),
                participant.getEmail(),
                participant.getFirstName(),
                participant.getLastName()
        );
    }

    @Transactional
    public void deleteParticipant(Long participantId, Long hackathonId) {
        if (participantId == null || participantId <= 0) {
            throw new BadRequestException("Invalid participant id");
        }

        Hackathon hackathon = findHackathonOrThrow(hackathonId);
        Participant participant = findParticipantInHackathonOrThrow(hackathon, participantId);

        hackathon.getParticipants().remove(participant);
        hackathonRepository.save(hackathon);
    }

    // ---- helpers

    private Hackathon findHackathonOrThrow(Long hackathonId) {
        if (hackathonId == null || hackathonId <= 0) {
            throw new BadRequestException("Invalid hackathon id");
        }
        return hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));
    }

    private Participant findParticipantInHackathonOrThrow(Hackathon hackathon, Long participantId) {
        return hackathon.getParticipants().stream()
                .filter(p -> p.getId().equals(participantId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException(
                        "Participant " + participantId + " not found in hackathon " + hackathon.getId()
                ));
    }

    private static String safeLower(String s) {
        return s == null ? "" : s.trim().toLowerCase();
    }

    private static String trimOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isBlank() ? null : t;
    }
}
