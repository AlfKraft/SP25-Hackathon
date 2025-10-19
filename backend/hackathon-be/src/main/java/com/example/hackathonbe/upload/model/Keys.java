package com.example.hackathonbe.upload.model;

import java.util.Set;

public final class Keys {
    private Keys() {}
    public static final Set<String> REQUIRED_MIN = Set.of("first_name", "last_name", "email", "role","skills","field_of_interest","motivation", "age","gender","education","years_experience");
    public static final Set<String> KNOWN = Set.of(
            "email","first_name","last_name",
            "role","skills","field_of_interest","motivation",
            "age","gender","education","years_experience",
            "has_team","team_lead","will_present_idea",
            "idea_name","problem","solution","expectations","target_audience","missing_roles","help_needed"
    );
}