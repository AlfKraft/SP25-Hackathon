package com.example.hackathonbe.controllers;

import com.example.hackathonbe.services.UploadService;
import com.example.hackathonbe.upload.model.ValidationReport;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService service;

    @PostMapping(value = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ValidationReport validate(@RequestPart("file") MultipartFile file) throws Exception {
        return service.validate(file);
    }
}
