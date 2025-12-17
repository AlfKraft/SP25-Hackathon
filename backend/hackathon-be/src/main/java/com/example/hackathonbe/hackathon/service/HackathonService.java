package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.common.exceptions.NotFoundException;
import com.example.hackathonbe.hackathon.dto.HackathonResponse;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class HackathonService {

    private final HackathonRepository repository;

    public HackathonService(HackathonRepository repository) {
        this.repository = repository;
    }

    /**
     * Public list endpoint:
     * Returns hackathons that are OPEN and whose startDate is in the future.
     */
    @Transactional(readOnly = true)
    public List<HackathonResponse> getOpenHackathons() {
        LocalDateTime now = LocalDateTime.now();

        return repository.findByStatus(HackathonStatus.OPEN)
                .stream()
                .filter(h -> h.getStartDate() != null)
                .filter(h -> h.getStartDate().isAfter(now))
                .map(this::toResponse)
                .toList();
    }

    /**
     * Public details endpoint:
     * Returns hackathon only if it exists and is OPEN.
     */
    @Transactional(readOnly = true)
    public HackathonResponse getHackathonById(Long id) {
        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid hackathon id");
        }

        Hackathon hackathon = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + id));

        if (hackathon.getStatus() != HackathonStatus.OPEN) {
            throw new BadRequestException("Hackathon is not open: " + id);
        }

        return toResponse(hackathon);
    }

    private HackathonResponse toResponse(Hackathon entity) {
        return new HackathonResponse(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getLocation(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getStatus(),
                entity.getQuestionnaire() != null ? entity.getQuestionnaire().getSource() : null,
                entity.getParticipants().size()
        );
    }
}
