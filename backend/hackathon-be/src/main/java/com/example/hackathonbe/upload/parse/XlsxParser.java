package com.example.hackathonbe.upload.parse;

import com.example.hackathonbe.upload.model.ParticipantPreviewRow;
import org.apache.poi.ss.usermodel.*;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

public class XlsxParser implements SpreadsheetParser {
    @Override
    public List<ParticipantPreviewRow> parse(InputStream in) throws Exception {
        try (Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getSheetAt(0);
            Iterator<Row> it = sheet.rowIterator();
            if (!it.hasNext()) return List.of();

            Row header = it.next();
            List<String> headers = new ArrayList<>();
            for (Cell c : header) headers.add(cellStr(c).trim().toLowerCase(Locale.ROOT));

            List<ParticipantPreviewRow> rows = new ArrayList<>();
            while (it.hasNext()) {
                Row r = it.next();
                Map<String, String> map = new LinkedHashMap<>();
                for (int i = 0; i < headers.size(); i++) {
                    Cell c = r.getCell(i, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    map.put(headers.get(i), cellStr(c));
                }
                rows.add(new ParticipantPreviewRow(map, true));
            }
            return rows;
        } catch (IOException e) {
            throw new IllegalArgumentException("Unsupported or corrupt Excel file", e);
        }
    }

    private static String cellStr(Cell c) {
        if (c == null) return "";
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> DateUtil.isCellDateFormatted(c)
                    ? c.getLocalDateTimeCellValue().toString()
                    : String.valueOf(c.getNumericCellValue());
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> c.getCellFormula();
            default -> "";
        };
    }
}

