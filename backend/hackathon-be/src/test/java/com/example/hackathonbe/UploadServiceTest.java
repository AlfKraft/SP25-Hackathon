package com.example.hackathonbe;

import com.example.hackathonbe.services.UploadService;
import com.example.hackathonbe.upload.model.ValidationReport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;


class UploadServiceTest {

    private final UploadService service = new UploadService();

    private MockMultipartFile csv(String name, String content) {
        return new MockMultipartFile(
                "file",
                name,
                "text/csv",
                content.getBytes()
        );
    }

    @Test
    @DisplayName("Valid CSV → counts valid/invalid rows and error codes")
    void validate_validAndInvalidRows() throws Exception {
        String content = String.join("\n",
                "first_name,last_name,email,skills,motivation",
                "Alice,Anderson,alice@example.com,Java|Spring,I'm excited!",
                "Bob,Brown,bad-email,Java,",
                "Cara,Cruz,cara@example.com,,I love hackathons",
                "Dan,Diaz,dan@,Python|Django,Count me in!"
        );
        var file = csv("participants.csv", content);

        ValidationReport report = service.validate(file);

        assertThat(report.totalRows()).isEqualTo(4);
        assertThat(report.validRows()).isEqualTo(1);
        assertThat(report.invalidRows()).isEqualTo(3);
        assertThat(report.topErrorCodes())
                .extracting("code")
                .contains("INVALID_EMAIL", "MISSING_SKILLS", "EMPTY_MOTIVATION");
    }

    @Test
    @DisplayName("Empty file → totalRows=0, validRows=0, invalidRows=0")
    void validate_emptyFile() throws Exception {
        var file = csv("participants.csv", "first_name,last_name,email,skills,motivation\n");
        ValidationReport report = service.validate(file);

        assertThat(report.totalRows()).isZero();
        assertThat(report.validRows()).isZero();
        assertThat(report.invalidRows()).isZero();
    }

    @Test
    @DisplayName("Unsupported extension (xlsx) → throws")
    void validate_unsupportedFileType() {
        var file = new MockMultipartFile("file", "participants.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[]{1, 2, 3});

        assertThrows(IllegalArgumentException.class, () -> service.validate(file));
    }
}