package com.example.hackathonbe.upload.parse;
import com.example.hackathonbe.upload.model.ParticipantPreviewRow;
import org.apache.poi.ss.usermodel.*;

import java.io.InputStream;
import java.util.*;

public class XlsxParser implements SpreadsheetParser {
    @Override
    public List<ParticipantPreviewRow> parse(InputStream in) throws Exception {
        try (Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getSheetAt(0);
            Iterator<Row> it = sheet.rowIterator();
            if (!it.hasNext()) return List.of();

            // 1) Build dynamic header keys
            Row headerRow = it.next();
            List<String> keys = new ArrayList<>();
            for (Cell c : headerRow) {
                keys.add(KeyUtil.toKey(getString(c)));
            }

            // 2) Build rows using whatever columns exist
            List<ParticipantPreviewRow> out = new ArrayList<>();
            while (it.hasNext()) {
                Row r = it.next();
                if (isRowEmpty(r)) continue;

                Map<String,String> map = new LinkedHashMap<>();
                for (int i = 0; i < keys.size(); i++) {
                    String k = keys.get(i);
                    if (k.isEmpty()) continue; // skip empty headers
                    Cell cell = r.getCell(i, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    map.put(k, getString(cell));
                }
                boolean valid = validateSoft(map);
                out.add(new ParticipantPreviewRow(map, valid));
            }
            return out;
        }
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

    private static boolean isRowEmpty(Row r) {
        if (r == null) return true;
        for (Cell c : r) {
            if (!getString(c).isBlank()) return false;
        }
        return true;
    }

    private static String getString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getDateCellValue().toString();
                } else {
                    double d = cell.getNumericCellValue();
                    if (Math.floor(d) == d) yield Long.toString((long) d);
                    yield Double.toString(d);
                }
            }
            case BOOLEAN -> Boolean.toString(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue();
                } catch (Exception e) {
                    yield cell.getCellFormula();
                }
            }
            default -> "";
        };
    }
}
