package com.example.hackathonbe.participant.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
public class ParticipantDto {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private JsonNode data;

}
