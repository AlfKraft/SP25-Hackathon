package com.example.hackathonbe.admin.controllers;

import com.example.hackathonbe.admin.dto.HackathonCreateRequest;
import com.example.hackathonbe.admin.dto.HackathonUpdateRequest;
import com.example.hackathonbe.admin.model.Hackathon;
import com.example.hackathonbe.admin.service.HackathonService;
import com.example.hackathonbe.admin.dto.HackathonResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/hackathons")
@RequiredArgsConstructor
public class HackathonController {

    private final HackathonService hackathonService;

    @PostMapping
    public ResponseEntity<HackathonResponse> create(@Valid @RequestBody HackathonCreateRequest request) {
        Hackathon created = hackathonService.createHackathon(request);
        HackathonResponse body = HackathonResponse.fromEntity(created);

        return ResponseEntity
                .created(URI.create("/api/hackathons/" + created.getId()))
                .body(body);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HackathonResponse> update(@PathVariable Long id,
                                                    @Valid @RequestBody HackathonUpdateRequest request) {
        Hackathon updated = hackathonService.updateHackathon(id, request);
        return ResponseEntity.ok(HackathonResponse.fromEntity(updated));
    }

    @GetMapping
    public ResponseEntity<List<HackathonResponse>> list() {
        List<HackathonResponse> list = hackathonService.listHackathons()
                .stream()
                .map(HackathonResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HackathonResponse> getById(@PathVariable Long id) {
        return hackathonService.getById(id)
                .map(h -> ResponseEntity.ok(HackathonResponse.fromEntity(h)))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        hackathonService.deleteById(id);
    }
}

