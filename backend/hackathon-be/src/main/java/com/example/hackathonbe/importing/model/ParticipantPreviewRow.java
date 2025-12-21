package com.example.hackathonbe.importing.model;

import java.util.Map;

public record ParticipantPreviewRow(
        Map<String,String> fields,
        boolean valid,
        int rowNumber,
        Map<String,Integer> keyToColumn,
        Map<String,String> keyToHeader
) {}