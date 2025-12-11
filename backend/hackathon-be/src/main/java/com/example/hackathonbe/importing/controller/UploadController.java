package com.example.hackathonbe.importing.controller;

import com.example.hackathonbe.importing.service.UploadService;
import com.example.hackathonbe.importing.model.ImportRequest;
import com.example.hackathonbe.importing.model.ImportSummary;
import com.example.hackathonbe.importing.model.ValidationReport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService service;

    @PostMapping(
            value = "/validate",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ValidationReport> validate(
            @RequestParam("file") MultipartFile file
    ) throws Exception {
        return ResponseEntity.ok(service.validate(file));
    }


    @PostMapping(value="/import", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ImportSummary> importValid(@RequestBody ImportRequest body) {
        if (body == null || body.getBatchPreviewId() == null || body.getBatchPreviewId().isBlank() || body.getHackathonId() == null) {
            return ResponseEntity.badRequest().build();
        }
        final UUID previewId;
        try {
            previewId = UUID.fromString(body.getBatchPreviewId());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }

        ImportSummary summary = service.importValid(previewId, body.getHackathonId());
        if (summary == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(summary);
    }


}
