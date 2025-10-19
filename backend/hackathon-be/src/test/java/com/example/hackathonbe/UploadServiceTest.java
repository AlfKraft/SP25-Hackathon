package com.example.hackathonbe;

import com.example.hackathonbe.services.UploadService;
import com.example.hackathonbe.upload.model.ValidationReport;
import com.example.hackathonbe.upload.preview.PreviewCache;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class UploadServiceTest {

    private final UploadService service = new UploadService();
    private static final String SAMPLE_CSV = """
        First Name,Last Name,Email,Primary Role,Has Team,Will Present Idea,Idea Name,Problem
        Alice,Johnson,alice@example.com,Designer,No,Yes,SmartBin,"Too much household waste without sorting"
        Brian,Smith,brian.smith@example.org,Programmer,Yes,No,,""
        Carla,Gonzalez,carla@example.net,Business Expert,No,Yes,PlantMatch,"Difficulty connecting indoor plant sellers with customers"
        David,Lee,david.lee@example.com,Marketing,Yes,No,,
        Ella,Martinez,ella@example.com,Programmer,No,Yes,StudySphere,"Students struggle to find focused study groups"
        Frank,Anderson,frank.anderson@example.org,Designer,Yes,No,,
        Grace,Nguyen,grace.nguyen@example.net,Business Expert,No,Yes,MealWizard,"Healthy meal planning is hard for busy people"
        Henry,Brown,henry.brown@example.com,Programmer,No,Yes,CodeMentor,"Beginners lack guidance when learning programming"
        """;

    @Test
    @DisplayName("CSV happy path → 8 total, 8 valid, 0 invalid, no top errors")
    void validate_csv_happyPath() throws Exception {
        var file = new MockMultipartFile(
                "file", "participants.csv", "text/csv",
                SAMPLE_CSV.getBytes(StandardCharsets.UTF_8)
        );

        ValidationReport report = service.validate(file);

        assertThat(report.batchPreviewId()).isNotNull();
        assertThat(report.totalRows()).isEqualTo(8);
        assertThat(report.validRows()).isEqualTo(8);
        assertThat(report.invalidRows()).isEqualTo(0);
        assertThat(report.topErrorCodes()).isEmpty();
    }

    @Test
    @DisplayName("Unknown header is reported but does not fail parsing")
    void validate_unknownHeader() throws Exception {
        String csv = SAMPLE_CSV.replace("Has Team", "Hass Team"); // typo to trigger unknown
        var file = new MockMultipartFile(
                "file", "participants.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        ValidationReport report = service.validate(file);

        assertThat(report.totalRows()).isEqualTo(8);
        assertThat(report.validRows()).isEqualTo(8); // still valid
        // expect UNKNOWN_HEADER present
        assertThat(report.topErrorCodes())
                .extracting(ValidationReport.TopError::code)
                .contains("UNKNOWN_HEADER");
        // count should be 1 unknown header (Hass Team)
        var unknown = report.topErrorCodes().stream()
                .filter(e -> e.code().equals("UNKNOWN_HEADER"))
                .findFirst().orElseThrow();
        assertThat(unknown.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Invalid email → INVALID_EMAIL counted and row becomes invalid")
    void validate_invalidEmail() throws Exception {
        String csv = SAMPLE_CSV.replace("alice@example.com", "not-an-email");
        var file = new MockMultipartFile(
                "file", "participants.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        ValidationReport report = service.validate(file);

        assertThat(report.totalRows()).isEqualTo(8);
        // one row invalid (Alice)
        assertThat(report.validRows()).isEqualTo(7);
        assertThat(report.invalidRows()).isEqualTo(1);

        assertThat(report.topErrorCodes())
                .extracting(ValidationReport.TopError::code)
                .contains("INVALID_EMAIL");
        var err = report.topErrorCodes().stream()
                .filter(e -> e.code().equals("INVALID_EMAIL"))
                .findFirst().orElseThrow();
        assertThat(err.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Empty file → zeros, no errors")
    void validate_emptyFile() throws Exception {
        var file = new MockMultipartFile("file", "empty.csv", "text/csv", new byte[0]);

        ValidationReport report = service.validate(file);

        assertThat(report.batchPreviewId()).isNull();
        assertThat(report.totalRows()).isZero();
        assertThat(report.validRows()).isZero();
        assertThat(report.invalidRows()).isZero();
        assertThat(report.topErrorCodes()).isEmpty();
    }

    @Test
    @DisplayName("Unsupported extension → returns report with UNSUPPORTED_FILE_TYPE")
    void validate_unsupportedFileType() throws Exception {
        var file = new MockMultipartFile(
                "file", "participants.xls", // not csv/xlsx/xlsm
                "application/vnd.ms-excel",
                new byte[]{1,2,3}
        );

        ValidationReport report = service.validate(file);

        assertThat(report.batchPreviewId()).isNull();
        assertThat(report.totalRows()).isZero();
        assertThat(report.topErrorCodes())
                .extracting(ValidationReport.TopError::code)
                .containsExactly("UNSUPPORTED_FILE_TYPE");
    }
}
