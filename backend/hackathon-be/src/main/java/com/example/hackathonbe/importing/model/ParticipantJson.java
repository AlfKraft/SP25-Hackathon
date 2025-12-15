package com.example.hackathonbe.importing.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.*;

import java.util.*;
import java.util.regex.Pattern;

public final class ParticipantJson {
    private static final ObjectMapper M = new ObjectMapper();
    private static final Pattern EMAIL_RX = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private ParticipantJson(){}

    public static ObjectNode toJson(Map<String, String> f) {
        ObjectNode p = M.createObjectNode();

        // required strings
        putS(p,"first_name", f.get("first_name"));
        putS(p,"last_name",  f.get("last_name"));
        putS(p,"email",      f.get("email"));
        putS(p,"role",       f.get("role"));
        putS(p,"gender",     f.get("gender"));
        putS(p,"education",  f.get("education"));

        // required numbers
        putN(p,"motivation",       f.get("motivation"));
        putN(p,"age",              f.get("age"));
        putN(p,"years_experience", f.get("years_experience"));

        // required array
        p.set("skills", toArray(f.get("skills")));

        // keep any extra fields
        f.forEach((k,v) -> {
            if (!p.has(k) && v != null && !v.isBlank()) p.put(k, v.trim());
        });
        return p;
    }

    public static List<String> validate(ObjectNode p) {
        var errs = new ArrayList<String>();
        reqS(p,"first_name", errs);
        reqS(p,"last_name",  errs);
        var email = reqS(p,"email", errs);
        if (email != null && !EMAIL_RX.matcher(email).matches()) errs.add("email format invalid");
        reqN(p,"motivation", errs);
        reqS(p,"role",       errs);
        reqA(p,"skills",     errs);
        reqN(p,"age",        errs);
        reqS(p,"gender",     errs);
        reqS(p,"education",  errs);
        reqN(p,"years_experience", errs);
        return errs;
    }

    private static void putS(ObjectNode n, String k, String v){ if (v!=null && !v.isBlank()) n.put(k, v.trim()); }
    private static void putN(ObjectNode n, String k, String v){
        if (v==null || v.isBlank()) return;
        try {
            if (v.contains(".")) n.put(k, Double.parseDouble(v.trim()));
            else n.put(k, Long.parseLong(v.trim()));
        } catch(NumberFormatException e){ n.put(k, v.trim()); }
    }
    private static ArrayNode toArray(String raw){
        ArrayNode arr = M.createArrayNode();
        if (raw == null || raw.isBlank()) return arr;
        try {
            JsonNode parsed = M.readTree(raw);
            if (parsed.isArray()) return (ArrayNode) parsed;
        } catch(Exception ignored){}
        Arrays.stream(raw.split("[,;]"))
                .map(String::trim).filter(s->!s.isEmpty())
                .forEach(arr::add);
        return arr;
    }
    private static String reqS(ObjectNode n, String k, List<String> errs){
        if (!n.hasNonNull(k) || n.get(k).asText().isBlank()) { errs.add(k+" is required"); return null; }
        return n.get(k).asText();
    }
    private static void reqN(ObjectNode n, String k, List<String> errs){
        if (!n.has(k)) { errs.add(k+" is required"); return; }
        if (!n.get(k).isNumber()) errs.add(k+" must be numeric");
    }
    private static void reqA(ObjectNode n, String k, List<String> errs){
        if (!n.has(k)) { errs.add(k+" is required"); return; }
        if (!n.get(k).isArray()) { errs.add(k+" must be an array"); return; }
        if (n.get(k).isEmpty()) errs.add(k+" must not be empty");
    }
}