package com.example.hackathonbe.controllers;

import com.example.hackathonbe.dto.ParticipantDto;
import com.example.hackathonbe.services.ParticipantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/participants")
@RequiredArgsConstructor
public class ParticipantController {

    private final ParticipantService participantService;

    @GetMapping(value = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<ParticipantDto> getAllParticipants() {
        return participantService.getAllParticipants();
    }
}
