package com.example.hackathonbe.participant.dto;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

public record ParticipantInfoResponse(
         Long id,
         String email,
         String firstName,
         String lastName
) {

}
