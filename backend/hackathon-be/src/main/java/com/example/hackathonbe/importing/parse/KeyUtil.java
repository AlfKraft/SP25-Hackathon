
package com.example.hackathonbe.importing.parse;

import java.text.Normalizer;
import java.util.Locale;

public final class KeyUtil {
    private KeyUtil() {}

    public static String toKey(String header) {
        if (header == null) return "";
        String s = Normalizer.normalize(header, Normalizer.Form.NFKC)
                .replace('\u00A0', ' ')
                .trim()
                .toLowerCase(Locale.ROOT);
        s = s.replaceAll("[^a-z0-9]+", "_");
        s = s.replaceAll("^_+|_+$", "");
        return s;
    }
}
