package com.example.hackathonbe.upload.model;

import lombok.Data;

@Data
public class ImportRequest {
    // Expecting raw UUID string (named as you asked: batchPreviewId)
    private String batchPreviewId;
    private Long hackathonId;
}