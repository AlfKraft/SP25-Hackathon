package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.dto.HackathonCreateRequest;
import com.example.hackathonbe.hackathon.dto.HackathonUpdateRequest;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.service.AdminHackathonService;
import com.example.hackathonbe.hackathon.dto.HackathonAdminResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/admin/hackathons")
@RequiredArgsConstructor
public class AdminHackathonController {

    private final AdminHackathonService hackathonService;

    @PostMapping
    public ResponseEntity<HackathonAdminResponse> create(@Valid @RequestBody HackathonCreateRequest request) {
        Hackathon created = hackathonService.createHackathon(request);
        HackathonAdminResponse body = HackathonAdminResponse.fromEntity(created);

        return ResponseEntity
                .created(URI.create("/api/admin/hackathons/" + created.getId()))
                .body(body);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HackathonAdminResponse> update(@PathVariable Long id,
                                                         @Valid @RequestBody HackathonUpdateRequest request) {
        Hackathon updated = hackathonService.updateHackathon(id, request);
        return ResponseEntity.ok(HackathonAdminResponse.fromEntity(updated));
    }

    @GetMapping
    public ResponseEntity<List<HackathonAdminResponse>> list() {
        List<HackathonAdminResponse> list = hackathonService.listHackathons()
                .stream()
                .map(HackathonAdminResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HackathonAdminResponse> getById(@PathVariable Long id) {
        return hackathonService.getById(id)
                .map(h -> ResponseEntity.ok(HackathonAdminResponse.fromEntity(h)))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        hackathonService.deleteById(id);
    }
}

