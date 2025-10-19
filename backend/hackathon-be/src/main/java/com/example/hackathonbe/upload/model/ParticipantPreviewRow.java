package com.example.hackathonbe.upload.model;

import java.util.Map;

public record ParticipantPreviewRow(
        Map<String,String> fields,
        boolean valid,
        int rowNumber,
        Map<String,Integer> keyToColumn,
        Map<String,String> keyToHeader
) {}