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

            Row headerRow = it.next();
            List<String> rawHeaders = new ArrayList<>();
            for (Cell c : headerRow) rawHeaders.add(getString(c));
            List<String> keys = new ArrayList<>(rawHeaders.size());
            for (String h : rawHeaders) keys.add(KeyUtil.toKey(h));

            Map<String,Integer> keyToCol = new LinkedHashMap<>();
            Map<String,String>  keyToHdr = new LinkedHashMap<>();
            for (int c = 0; c < keys.size(); c++) {
                String k = keys.get(c);
                if (!k.isEmpty() && !keyToCol.containsKey(k)) {
                    keyToCol.put(k, c+1);
                    keyToHdr.put(k, rawHeaders.get(c));
                }
            }

            List<ParticipantPreviewRow> out = new ArrayList<>();
            while (it.hasNext()) {
                Row r = it.next();
                if (r == null) continue;

                int rowNumber = r.getRowNum() + 1; // 1-based
                Map<String,String> map = new LinkedHashMap<>();
                for (int i = 0; i < keys.size(); i++) {
                    String k = keys.get(i);
                    if (k.isEmpty()) continue;
                    Cell cell = r.getCell(i, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    map.put(k, getString(cell));
                }
                boolean any = map.values().stream().anyMatch(v -> v != null && !v.isBlank());
                if (any) out.add(new ParticipantPreviewRow(map, true, rowNumber, keyToCol, keyToHdr));
            }
            return out;
        }
    }

    private static String getString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) yield cell.getDateCellValue().toString();
                double d = cell.getNumericCellValue();
                if (Math.floor(d)==d) yield Long.toString((long)d);
                yield Double.toString(d);
            }
            case BOOLEAN -> Boolean.toString(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield cell.getStringCellValue(); }
                catch (Exception e) { yield cell.getCellFormula(); }
            }
            default -> "";
        };
    }
}
