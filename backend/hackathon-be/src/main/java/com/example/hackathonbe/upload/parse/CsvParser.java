package com.example.hackathonbe.upload.parse;

import com.example.hackathonbe.upload.model.ParticipantPreviewRow;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class CsvParser implements SpreadsheetParser {
    @Override
    public List<ParticipantPreviewRow> parse(InputStream in) throws Exception {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String header = br.readLine();
            if (header == null) return List.of();

            List<String> rawHeaders = split(header);
            List<String> keys = new ArrayList<>(rawHeaders.size());
            for (String h : rawHeaders) keys.add(KeyUtil.toKey(h));

            List<ParticipantPreviewRow> out = new ArrayList<>();
            for (String row; (row = br.readLine()) != null; ) {
                List<String> cols = split(row);
                if (cols.stream().allMatch(s -> s == null || s.isBlank())) continue;

                Map<String,String> map = new LinkedHashMap<>();
                for (int i = 0; i < keys.size(); i++) {
                    String k = keys.get(i);
                    if (k.isEmpty()) continue;
                    map.put(k, i < cols.size() ? cols.get(i) : "");
                }
                boolean valid = validateSoft(map);
                out.add(new ParticipantPreviewRow(map, valid));
            }
            return out;
        }
    }

    private static List<String> split(String line) {
        return Arrays.asList(line.split(",", -1)); // keep trailing empties
    }

    private static boolean validateSoft(Map<String,String> m) {
        boolean ok = true;
        if (m.containsKey("first_name")) ok &= notBlank(m.get("first_name"));
        if (m.containsKey("last_name"))  ok &= notBlank(m.get("last_name"));
        if (m.containsKey("email"))      ok &= emailLike(m.get("email"));
        return ok;
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }

    private static boolean emailLike(String s) {
        return s == null || s.isBlank() || s.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    }
}
