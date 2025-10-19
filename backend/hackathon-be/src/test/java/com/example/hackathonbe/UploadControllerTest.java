package com.example.hackathonbe;

import com.example.hackathonbe.controllers.UploadController;
import com.example.hackathonbe.services.UploadService;
import com.example.hackathonbe.upload.model.ValidationReport;
import com.example.hackathonbe.upload.model.ValidationReport.TopError;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = UploadController.class)
@WithMockUser // adapt/remove if your project has different security setup
class UploadControllerTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    UploadService service;

    @Test
    @DisplayName("POST /api/upload/validate returns ValidationReport JSON")
    @WithMockUser
    void validate_ok() throws Exception {
        var previewId = UUID.randomUUID();
        var mockReport = new ValidationReport(
                previewId,
                8, 8, 0,
                List.of(new TopError("INVALID_EMAIL", 2))
        );

        when(service.validate(any())).thenReturn(mockReport);

        var file = new MockMultipartFile(
                "file",
                "participants.csv",
                "text/csv",
                "First Name,Last Name\nAlice,Johnson".getBytes()
        );

        mvc.perform(multipart("/api/upload/validate")
                        .file(file)
                        .with(csrf())
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.batchPreviewId").value(previewId.toString()))
                .andExpect(jsonPath("$.totalRows").value(8))
                .andExpect(jsonPath("$.validRows").value(8))
                .andExpect(jsonPath("$.invalidRows").value(0))
                .andExpect(jsonPath("$.topErrorCodes[0].code").value("INVALID_EMAIL"))
                .andExpect(jsonPath("$.topErrorCodes[0].count").value(2));
    }

    @Test
    @DisplayName("Controller propagates report for unsupported file type")
    @WithMockUser
    void validate_unsupportedType() throws Exception {
        var mockReport = new ValidationReport(
                null,
                0, 0, 0,
                List.of(new TopError("UNSUPPORTED_FILE_TYPE", 1))
        );

        when(service.validate(any())).thenReturn(mockReport);

        var file = new MockMultipartFile(
                "file", "participants.xls", "application/vnd.ms-excel", new byte[]{1,2,3}
        );

        mvc.perform(multipart("/api/upload/validate")
                        .file(file)
                        .with(csrf())
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.batchPreviewId").doesNotExist())
                .andExpect(jsonPath("$.totalRows").value(0))
                .andExpect(jsonPath("$.topErrorCodes[0].code").value("UNSUPPORTED_FILE_TYPE"))
                .andExpect(jsonPath("$.topErrorCodes[0].count").value(1));
    }
}
