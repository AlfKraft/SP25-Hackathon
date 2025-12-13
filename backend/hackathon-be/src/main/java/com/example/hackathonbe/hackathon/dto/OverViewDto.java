package com.example.hackathonbe.hackathon.dto;

public record OverViewDto(
        Integer registeredParticipants,
        Integer teamsCreated
                          ) {
    public OverViewDto(Integer registeredParticipants, Integer teamsCreated) {
        this.registeredParticipants = registeredParticipants;
        this.teamsCreated = teamsCreated;
    }
}
