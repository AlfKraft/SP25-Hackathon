package com.example.hackathonbe.upload.model;

import lombok.Getter;

import java.util.List;
import java.util.UUID;

public record ValidationReport(
        UUID batchPreviewId,
        int totalRows,
        int validRows,
        int invalidRows,
        List<TopError> topErrorCodes
) {
    public record TopError(String code, long count) {}
}
