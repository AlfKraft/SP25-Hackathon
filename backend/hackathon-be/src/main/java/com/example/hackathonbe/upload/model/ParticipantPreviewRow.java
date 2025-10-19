package com.example.hackathonbe.upload.model;

import java.util.Map;

public record ParticipantPreviewRow(
        Map<String, String> fields,  // canonical header -> value
        boolean valid
) {}