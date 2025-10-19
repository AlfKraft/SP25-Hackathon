package com.example.hackathonbe.upload.parse;

import com.example.hackathonbe.upload.model.ParticipantPreviewRow;
import org.apache.commons.csv.*;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class CsvParser implements SpreadsheetParser {
    @Override
    public List<ParticipantPreviewRow> parse(InputStream in) throws Exception {
        try (CSVParser parser = CSVParser.parse(
                new InputStreamReader(in, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build())) {

            Map<String, Integer> hdr = parser.getHeaderMap();
            Map<String,Integer> lcHdr = new LinkedHashMap<>();
            for (Map.Entry<String,Integer> e : hdr.entrySet()) {
                lcHdr.put(e.getKey().trim().toLowerCase(), e.getValue());
            }

            List<ParticipantPreviewRow> rows = new ArrayList<>();
            for (CSVRecord rec : parser) {
                Map<String,String> map = new LinkedHashMap<>();
                for (Map.Entry<String,Integer> e : lcHdr.entrySet()) {
                    map.put(e.getKey(), rec.get(e.getValue()));
                }
                rows.add(new ParticipantPreviewRow(map, true));
            }
            return rows;
        }
    }
}
