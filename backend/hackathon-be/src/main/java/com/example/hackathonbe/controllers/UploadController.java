package com.example.hackathonbe.controllers;

import com.example.hackathonbe.services.UploadService;
import com.example.hackathonbe.upload.model.ImportRequest;
import com.example.hackathonbe.upload.model.ImportSummary;
import com.example.hackathonbe.upload.model.ValidationReport;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService service;

    @PostMapping(value = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ValidationReport validate(@RequestPart("file") MultipartFile file) throws Exception {
        return service.validate(file);
    }

    @PostMapping(value="/import", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ImportSummary> importValid(@RequestBody ImportRequest body) {
        if (body == null || body.getBatchPreviewId() == null || body.getBatchPreviewId().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        final UUID previewId;
        try {
            previewId = UUID.fromString(body.getBatchPreviewId());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }

        ImportSummary summary = service.importValid(previewId);
        if (summary == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(summary);
    }


}
