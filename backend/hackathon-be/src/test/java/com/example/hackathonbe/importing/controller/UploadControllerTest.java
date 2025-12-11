package com.example.hackathonbe.importing.controller;

import com.example.hackathonbe.auth.security.JwtAuthenticationFilter;
import com.example.hackathonbe.importing.controller.UploadController;
import com.example.hackathonbe.importing.service.UploadService;
import com.example.hackathonbe.importing.model.ValidationReport;
import com.example.hackathonbe.importing.model.ValidationReport.CellError;
import com.example.hackathonbe.importing.model.ValidationReport.TopError;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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
@AutoConfigureMockMvc(addFilters = false)
@WithMockUser
class UploadControllerTest {

    @Autowired MockMvc mvc;

    @MockitoBean UploadService uploadService;

    @MockBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("POST /api/upload/validate returns JSON with topErrorCodes and cell-level errors (with CSRF)")
    void validate_ok_with_cell_errors() throws Exception {
        var previewId = UUID.randomUUID();

        var report = new ValidationReport(
                previewId,
                3, 2, 1,
                List.of(new TopError("INVALID_EMAIL", 1), new TopError("UNKNOWN_HEADER", 1)),
                List.of(
                        new CellError(1, 6, "hass_team", "Hass Team", "UNKNOWN_HEADER", null),
                        new CellError(3, 1, "email", "Email", "INVALID_EMAIL", "not-an-email")
                )
        );

        when(uploadService.validate(any())).thenReturn(report);

        var file = new MockMultipartFile(
                "file", "participants.csv", "text/csv", "Email\nx@y".getBytes()
        );

        mvc.perform(multipart("/api/upload/validate")
                        .file(file)
                        .with(csrf()) // 👈 required if CSRF is enabled
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.batchPreviewId").value(previewId.toString()))
                .andExpect(jsonPath("$.totalRows").value(3))
                .andExpect(jsonPath("$.invalidRows").value(1))
                .andExpect(jsonPath("$.topErrorCodes[0].code").value("INVALID_EMAIL"))
                .andExpect(jsonPath("$.topErrorCodes[0].count").value(1))
                .andExpect(jsonPath("$.errors[0].rowNumber").value(1))
                .andExpect(jsonPath("$.errors[0].columnNumber").value(6))
                .andExpect(jsonPath("$.errors[0].header").value("Hass Team"))
                .andExpect(jsonPath("$.errors[1].key").value("email"))
                .andExpect(jsonPath("$.errors[1].code").value("INVALID_EMAIL"));
    }
}
