package com.example.hackathonbe.services;

import com.example.hackathonbe.dto.ParticipantDto;
import com.example.hackathonbe.repositories.ParticipantRepository;
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
            dto.setData(participant.getData());
            return dto;
        }).toList();
    }


}
