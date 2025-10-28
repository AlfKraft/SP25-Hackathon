package com.example.hackathonbe.repositories;

import com.example.hackathonbe.teams.model.Team;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TeamRepository extends JpaRepository<Team, UUID> {
    List<Team> findByGenerationIdOrderByScoreDesc(UUID generationId);
}