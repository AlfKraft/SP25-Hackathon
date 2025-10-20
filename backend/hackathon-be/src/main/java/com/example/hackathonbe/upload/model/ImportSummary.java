package com.example.hackathonbe.upload.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ImportSummary {
    private int total;
    private int inserted;
    private int updated;
    private int skipped;
    private int deduped;
}