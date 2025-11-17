package com.example.hackathonbe.team.dto;

import java.util.List;
import java.util.UUID;

public class TeamEditRequests {
    /**
     * Rename a team.
     */
    public record UpdateTeamNameRequest(
            String name
    ) {}

    /**
     * Add one or more participants to a team.
     */
    public record AddMembersRequest(
            List<Long> participantIds
    ) {}

    /**
     * Move a participant into another team.
     * Also used for drag & drop UI.
     */
    public record MoveMemberRequest(
            Long participantId,
            UUID targetTeamId
    ) {}

    public record RemoveMembersRequest(
            List<Long> participantIds
    ) {}
}
