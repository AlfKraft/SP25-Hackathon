package com.example.hackathonbe.upload.model;

import java.util.Set;

public final class Keys {
    private Keys() {}
    public static final Set<String> REQUIRED_MIN = Set.of("first_name", "last_name", "email");
    public static final Set<String> KNOWN = Set.of(
            "first_name","last_name","email",
            "primary_role","secondary_role",
            "has_team","team_lead",
            "will_present_idea","idea_name","problem","solution","target_audience","missing_roles","help_needed",
            "expectations","first_entre_event","age","gender","education","employment"
    );
}