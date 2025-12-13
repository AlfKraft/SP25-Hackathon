package com.example.hackathonbe.team.repository;

import com.example.hackathonbe.team.model.Team;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TeamRepository extends JpaRepository<Team, UUID> {
    List<Team> findByGenerationIdOrderByScoreDesc(UUID generationId);
    void deleteByHackathonId(Long hackathonId);
    List<Team> findByHackathonId(Long hackathonId);

    List<Team> findByHackathonIdOrderByScoreDesc(Long hackathonId);
    List<Team> findByHackathonIdOrderByNameAsc(Long hackathonId);
}