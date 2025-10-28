package com.example.hackathonbe.controllers;

import com.example.hackathonbe.dto.TeamDTO;
import com.example.hackathonbe.services.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    // POST /api/teams/generate?teamSize=4
    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@RequestParam(name = "teamSize", required = false) Integer teamSize) {
        UUID generationId = teamService.generateTeams(teamSize);
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
}
