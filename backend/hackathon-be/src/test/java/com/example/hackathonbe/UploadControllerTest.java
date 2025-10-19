package com.example.hackathonbe;

import com.example.hackathonbe.controllers.UploadController;
import com.example.hackathonbe.services.UploadService;
import com.example.hackathonbe.upload.model.ValidationReport;
import com.example.hackathonbe.upload.model.ValidationReport.TopError;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = UploadController.class)
class UploadControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UploadService service;

    @Test
    @DisplayName("POST /api/upload/validate accepts multipart and returns report JSON")
    @WithMockUser
    void validate_endpoint_ok() throws Exception {
        // Given service returns a fixed report
        var report = new ValidationReport(
                UUID.fromString("6e67c8aa-f6ea-424e-a492-50c2c26018f8"),
                6, 2, 4,
                List.of(new TopError("MISSING_SKILLS", 2),
                        new TopError("EMPTY_MOTIVATION", 2),
                        new TopError("INVALID_EMAIL", 2))
        );
        when(service.validate(any())).thenReturn(report);

        var file = new MockMultipartFile(
                "file",
                "participants.csv",
                "text/csv",
                """
                first_name,last_name,email,skills,motivation
                A,B,a@a.com,Java,Go go
                """.getBytes()
        );

        mvc.perform(multipart("/api/upload/validate")
                                .file(file)
                                .with(csrf())
                                .contentType(MediaType.MULTIPART_FORM_DATA)
                                .accept(MediaType.APPLICATION_JSON)
                )
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.batchPreviewId", is("6e67c8aa-f6ea-424e-a492-50c2c26018f8")))
                .andExpect(jsonPath("$.totalRows", is(6)))
                .andExpect(jsonPath("$.validRows", is(2)))
                .andExpect(jsonPath("$.invalidRows", is(4)))
                .andExpect(jsonPath("$.topErrorCodes[0].code", is("MISSING_SKILLS")));
    }

    @Test
    @DisplayName("Rejects non-multipart requests with 415")
    @WithMockUser
    void validate_rejects_nonMultipart() throws Exception {
        mvc.perform(
                multipart("/api/upload/validate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
        ).andExpect(status().isUnsupportedMediaType());
    }
}
