package com.example.hackathonbe;

import com.example.hackathonbe.services.UploadService;
import com.example.hackathonbe.upload.model.ValidationReport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class UploadServiceTest {

    private final UploadService service = new UploadService();

    private static final String SAMPLE_CSV =
            String.join("\r\n",
                    "First Name,Last Name,Email,Role,Skills,Field of Interest,Motivation,Age,Gender,Education,Years Experience,Has Team,Will Present Idea,Idea Name,Problem",
                    "Alice,Johnson,alice@example.com,Designer,UI Figma,Health,90,24,Female,Bachelor,2,No,Yes,SmartBin,Too much household waste without sorting",
                    "Brian,Smith,brian.smith@example.org,Programmer,Java Spring,FinTech,80,27,Male,Master,4,Yes,No,,",
                    "Carla,Gonzalez,carla@example.net,Business Expert,Sales PM,Education,70,29,Female,Bachelor,6,No,Yes,PlantMatch,Difficulty connecting indoor plant sellers with customers",
                    "David,Lee,david.lee@example.com,Marketing,SEO Content,Sustainability,60,31,Male,Bachelor,7,Yes,No,,",
                    "Ella,Martinez,ella@example.com,Programmer,React,Education,75,22,Female,Bachelor,1,No,Yes,StudySphere,Students struggle to find focused study groups",
                    "Frank,Anderson,frank.anderson@example.org,Designer,Wireframes,Health,65,33,Male,Master,8,Yes,No,,",
                    "Grace,Nguyen,grace.nguyen@example.net,Business Expert,Ops,Education,85,26,Female,Master,5,No,Yes,MealWizard,Healthy meal planning is hard for busy people",
                    "Henry,Brown,henry.brown@example.com,Programmer,Node,Education,55,28,Male,Bachelor,3,No,Yes,CodeMentor,Beginners lack guidance when learning programming"
            );

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

        assertThat(report.topErrorCodes())
                .extracting(ValidationReport.TopError::code)
                .contains("UNKNOWN_HEADER");
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
