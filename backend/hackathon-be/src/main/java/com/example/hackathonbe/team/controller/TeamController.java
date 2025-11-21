package com.example.hackathonbe.team.controller;

import com.example.hackathonbe.team.dto.TeamDTO;
import com.example.hackathonbe.team.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.hackathonbe.team.dto.TeamEditRequests.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    // POST /api/teams/generate?teamSize=4
    @PostMapping("/{hackathonId}/generate")
    public ResponseEntity<Map<String, Object>> generate(@RequestParam(name = "teamSize", required = false) Integer teamSize,
                                                        @PathVariable Long hackathonId) {
        UUID generationId = teamService.generateTeams(teamSize, hackathonId);
        return ResponseEntity.ok(Map.of(
                "generationId", generationId,
                "message", "Teams generated"
        ));
    }

    // GET /api/teams?generationId={uuid}
    @GetMapping
    public ResponseEntity<List<TeamDTO>> getTeams(@RequestParam(name = "generationId", required = false) UUID generationId) {
        return ResponseEntity.ok(teamService.getTeams(generationId));
    }

    // PATCH /api/teams/{teamId} – rename team
    @PatchMapping("/{teamId}")
    public ResponseEntity<TeamDTO> renameTeam(
            @PathVariable UUID teamId,
            @RequestBody UpdateTeamNameRequest request
    ) {
        return ResponseEntity.ok(teamService.renameTeam(teamId, request));
    }

    // POST /api/teams/{teamId}/members – add participant(s) to team
    @PostMapping("/{teamId}/members")
    public ResponseEntity<TeamDTO> addMembers(
            @PathVariable UUID teamId,
            @RequestBody AddMembersRequest request
    ) {
        return ResponseEntity.ok(teamService.addMembers(teamId, request));
    }

    // DELETE /api/teams/{teamId}/members/{participantId} – remove participant from team
    @DeleteMapping("/{teamId}/members/{participantId}")
    public ResponseEntity<TeamDTO> removeMember(
            @PathVariable UUID teamId,
            @PathVariable Long participantId
    ) {
        return ResponseEntity.ok(teamService.removeMember(teamId, participantId));
    }

    // POST /api/teams/move-member – drag & drop between teams
    @PostMapping("/move-member")
    public ResponseEntity<Void> moveMember(@RequestBody MoveMemberRequest request) {
        teamService.moveMember(request);
        return ResponseEntity.ok().build();
    }

}
