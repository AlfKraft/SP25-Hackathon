package com.example.hackathonbe.importing.preview;

import com.example.hackathonbe.importing.model.ParticipantPreviewRow;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class PreviewCache {
    private static final class Entry {
        List<ParticipantPreviewRow> rows;
        Instant createdAt = Instant.now();
        Entry(List<ParticipantPreviewRow> rows) { this.rows = rows; }
    }

    private final ConcurrentHashMap<UUID, Entry> map = new ConcurrentHashMap<>();

    public UUID put(List<ParticipantPreviewRow> rows) {
        UUID id = UUID.randomUUID();
        map.put(id, new Entry(rows));
        return id;
    }

    public List<ParticipantPreviewRow> get(UUID id) {
        Entry e = map.get(id);
        return e == null ? null : e.rows;
    }
}
