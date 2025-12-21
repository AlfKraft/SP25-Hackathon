package com.example.hackathonbe.importing.parse;

import com.example.hackathonbe.importing.model.ParticipantPreviewRow;
import java.io.InputStream;
import java.util.List;

public interface SpreadsheetParser {
    List<ParticipantPreviewRow> parse(InputStream in) throws Exception;
}
