package com.example.hackathonbe.common.exceptions.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record ApiError(
        String code,
        String message,
        int status,
        String path,
        OffsetDateTime timestamp,
        List<FieldViolation> fieldErrors
) {
    public record FieldViolation(String field, String message, Object rejectedValue) {}
}
