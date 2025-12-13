package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.hackathon.dto.HackathonResponse;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HackathonService {

    private final HackathonRepository repository;

    public HackathonService(HackathonRepository repository) {
        this.repository = repository;
    }

    public List<HackathonResponse> getOpenHackathons() {
        return repository.findByStatus(HackathonStatus.OPEN)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public HackathonResponse getHackathonById(Long id) {
        Hackathon hackathon = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + id));
        if (hackathon.getStatus() != HackathonStatus.OPEN) {
            throw new IllegalArgumentException("Hackathon is not open: " + id);
        }
        return toResponse(hackathon);
    }

    private HackathonResponse toResponse(Hackathon entity) {
        // adjust to your actual fields / constructor
        return new HackathonResponse(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getLocation(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getStatus()
        );
    }
}
