package com.example.hackathonbe.hackathon.model;

public enum CoreFieldKey {
    FIRST_NAME("first_name", "First name", "TEXT", true),
    LAST_NAME("last_name", "Last name", "TEXT", true),
    EMAIL("email", "Email", "TEXT", true),
    ROLE("role", "Role in team", "TEXT", true),
    SKILLS("skills", "Key skills", "TEXT", true),
    MOTIVATION("motivation", "Motivation to join", "NUMBER", true),
    AGE("age", "Age", "NUMBER", true),
    GENDER("gender", "Gender", "TEXT", true),
    EDUCATION("education", "Education", "TEXT", true),
    YEARS_EXPERIENCE("years_experience", "Years of experience", "NUMBER", true);

    private final String key;
    private final String defaultLabel;
    private final String defaultType;
    private final boolean required;

    CoreFieldKey(String key, String defaultLabel, String defaultType, boolean required) {
        this.key = key;
        this.defaultLabel = defaultLabel;
        this.defaultType = defaultType;
        this.required = required;
    }

    public String key() {
        return key;
    }

    public String defaultLabel() {
        return defaultLabel;
    }

    public String defaultType() {
        return defaultType;
    }

    public boolean required() {
        return required;
    }

    public static CoreFieldKey fromKey(String key) {
        for (CoreFieldKey fieldKey : values()) {
            if (fieldKey.key.equals(key)) {
                return fieldKey;
            }
        }
        return null;
    }

}
