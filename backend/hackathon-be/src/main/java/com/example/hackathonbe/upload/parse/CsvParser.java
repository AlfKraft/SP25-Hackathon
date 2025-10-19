package com.example.hackathonbe.upload.parse;

import com.example.hackathonbe.upload.model.ParticipantPreviewRow;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class CsvParser implements SpreadsheetParser {
    @Override
    public List<ParticipantPreviewRow> parse(InputStream in) throws Exception {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String headerLine = br.readLine();
            if (headerLine == null) return List.of();

            List<String> rawHeaders = split(headerLine);
            List<String> keys = new ArrayList<>(rawHeaders.size());
            for (String h : rawHeaders) keys.add(KeyUtil.toKey(h));

            // Build key -> column and key -> original header
            Map<String,Integer> keyToCol = new LinkedHashMap<>();
            Map<String,String>  keyToHdr = new LinkedHashMap<>();
            for (int c = 0; c < keys.size(); c++) {
                String k = keys.get(c);
                if (!k.isEmpty() && !keyToCol.containsKey(k)) {
                    keyToCol.put(k, c+1);                  // 1-based column
                    keyToHdr.put(k, rawHeaders.get(c));    // original header
                }
            }

            List<ParticipantPreviewRow> out = new ArrayList<>();
            String row;
            int rowNumber = 1; // header = 1
            while ((row = br.readLine()) != null) {
                rowNumber++;
                List<String> cols = split(row);
                boolean allBlank = cols.stream().allMatch(s -> s == null || s.isBlank());
                if (allBlank) continue;

                Map<String,String> map = new LinkedHashMap<>();
                for (int i = 0; i < keys.size(); i++) {
                    String k = keys.get(i);
                    if (k.isEmpty()) continue;
                    map.put(k, i < cols.size() ? cols.get(i) : "");
                }
                out.add(new ParticipantPreviewRow(map, true, rowNumber, keyToCol, keyToHdr));
            }
            return out;
        }
    }

    private static List<String> split(String line) {
        // Minimal CSV; replace with Apache Commons CSV if you need full RFC
        return Arrays.asList(line.split(",", -1));
    }
}
