package com.example.hackathonbe.participant.service;

import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParticipantService {

    private final ParticipantRepository participantRepository;

    public List<ParticipantDto> getAllParticipants() {
        return participantRepository.findAll().stream().map(participant -> {
            ParticipantDto dto = new ParticipantDto();
            dto.setId(participant.getId());
            dto.setEmail(participant.getEmail());
            dto.setFirstName(participant.getFirstName());
            dto.setLastName(participant.getLastName());
            return dto;
        }).toList();
    }


}
