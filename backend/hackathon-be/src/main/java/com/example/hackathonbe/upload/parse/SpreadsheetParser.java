package com.example.hackathonbe.upload.parse;

import com.example.hackathonbe.upload.model.ParticipantPreviewRow;
import java.io.InputStream;
import java.util.List;

public interface SpreadsheetParser {
    List<ParticipantPreviewRow> parse(InputStream in) throws Exception;
}
