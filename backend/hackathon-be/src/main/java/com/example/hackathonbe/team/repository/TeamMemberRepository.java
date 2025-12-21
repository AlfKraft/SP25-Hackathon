package com.example.hackathonbe.team.repository;

import com.example.hackathonbe.team.model.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeamMemberRepository extends JpaRepository<TeamMember, UUID> {

    List<TeamMember> findByTeamId(UUID teamId);

    List<TeamMember> findByGenerationId(UUID generationId);

    Optional<TeamMember> findByTeamIdAndParticipantId(UUID teamId, Long participantId);

    Optional<TeamMember> findByGenerationIdAndParticipantId(UUID generationId, Long participantId);

    boolean existsByGenerationIdAndParticipantId(UUID generationId, Long participantId);
}
