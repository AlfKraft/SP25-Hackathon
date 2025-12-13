package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.dto.HackathonResponse;
import com.example.hackathonbe.hackathon.service.HackathonService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hackathons")
public class HackathonController {

    private final HackathonService service;

    public HackathonController(HackathonService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<HackathonResponse>> getOpenHackathons() {
        return ResponseEntity.ok(service.getOpenHackathons());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HackathonResponse> getHackathonById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getHackathonById(id));
    }
}
