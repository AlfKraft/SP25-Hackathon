package com.example.hackathonbe.team.service;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.hackathon.repositories.HackathonRepository;
import com.example.hackathonbe.hackathon.repositories.QuestionnaireAnswerRepository;
import com.example.hackathonbe.team.dto.TeamDTO;
import com.example.hackathonbe.team.model.Team;
import com.example.hackathonbe.team.model.TeamMember;
import com.example.hackathonbe.team.repository.TeamMemberRepository;
import com.example.hackathonbe.team.repository.TeamRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.hackathonbe.team.dto.TeamEditRequests.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final HackathonRepository hackathonRepository;
    private final QuestionnaireAnswerRepository questionnaireAnswerRepository;

    @Transactional
    public UUID generateTeams(Integer requestedTeamSize, Long hackathonId) {
        int targetTeamSize = (requestedTeamSize == null || requestedTeamSize < 3) ? 4 : requestedTeamSize;

        // 1) Load candidates for this hackathon
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));

        List<Candidate> candidates = new ArrayList<>();
        for (Participant participant : hackathon.getParticipants()) {
            QuestionnaireAnswer answer = questionnaireAnswerRepository
                    .findByQuestionnaireAndParticipant(hackathon.getQuestionnaire(), participant)
                    .orElse(null);

            if (answer == null) {
                continue; // skip participants without answers
            }

            candidates.add(Candidate.fromQuestionnaireAnswer(answer));
        }

        if (candidates.isEmpty()) {
            // Nothing to generate
            return UUID.randomUUID();
        }

        // 2) Seed initial teams with strongest candidates (motivation + years of experience)
        candidates.sort(Comparator.comparingInt((Candidate candidate) ->
                candidate.motivation + candidate.yearsExperience).reversed());

        int numberOfTeams = Math.max(1, candidates.size() / targetTeamSize);
        List<TeamBuild> teamBuilds = new ArrayList<>();

        for (int i = 0; i < numberOfTeams && i < candidates.size(); i++) {
            TeamBuild teamBuild = new TeamBuild("Team " + (i + 1));
            teamBuild.addMember(candidates.get(i)); // seed with one strong candidate
            teamBuilds.add(teamBuild);
        }

        // 3) Assign remaining candidates
        Set<Long> alreadyAssignedParticipantIds = teamBuilds.stream()
                .flatMap(teamBuild -> teamBuild.members.stream())
                .map(candidate -> candidate.participantId)
                .collect(Collectors.toSet());

        List<Candidate> unassignedCandidates = candidates.stream()
                .filter(candidate -> !alreadyAssignedParticipantIds.contains(candidate.participantId))
                .toList();

        for (Candidate candidate : unassignedCandidates) {
            TeamBuild bestTeam = null;
            double bestGain = Double.NEGATIVE_INFINITY;

            for (TeamBuild teamBuild : teamBuilds) {
                if (teamBuild.members.size() >= targetTeamSize) {
                    continue;
                }
                double gain = teamBuild.calculateMarginalGain(candidate);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestTeam = teamBuild;
                }
            }

            if (bestTeam == null) {
                // All teams are at or above target size; assign to team where candidate fits best
                bestTeam = teamBuilds.stream()
                        .max(Comparator.comparingDouble(teamBuild -> teamBuild.calculateMarginalGain(candidate)))
                        .orElse(teamBuilds.get(0));
            }

            bestTeam.addMember(candidate);
        }

        // 4) Recompute final scores
        for (TeamBuild teamBuild : teamBuilds) {
            teamBuild.recomputeScore();
        }

        // 5) Persist teams and members
        UUID generationId = UUID.randomUUID();

        for (TeamBuild teamBuild : teamBuilds) {
            Team team = new Team();
            team.setName(teamBuild.name);
            team.setScore(teamBuild.score);
            team.setGenerationId(generationId);
            team.setHackathon(hackathon); // assuming Team has a hackathon field
            teamRepository.save(team);

            for (Candidate candidate : teamBuild.members) {
                TeamMember teamMember = new TeamMember();
                teamMember.setTeamId(team.getId());
                teamMember.setParticipantId(candidate.participantId);
                teamMember.setRoleSnapshot(candidate.role);
                teamMember.setSkillsSnapshot(String.join(";", candidate.skills));
                teamMember.setMotivationSnapshot(candidate.motivation);
                teamMember.setYearsExperienceSnapshot(candidate.yearsExperience);
                teamMember.setGenerationId(generationId);
                teamMemberRepository.save(teamMember);
            }
        }

        return generationId;
    }

    @Transactional(readOnly = true)
    public List<TeamDTO> getTeams(UUID generationId) {
        List<Team> teams = (generationId == null)
                ? teamRepository.findAll()
                : teamRepository.findByGenerationIdOrderByScoreDesc(generationId);

        Map<UUID, List<TeamMember>> membersByTeamId = teamMemberRepository.findAll()
                .stream()
                .collect(Collectors.groupingBy(TeamMember::getTeamId));

        return teams.stream()
                .map(team -> new TeamDTO(team, membersByTeamId.getOrDefault(team.getId(), List.of())))
                .toList();
    }

    @Transactional
    public TeamDTO renameTeam(UUID teamId, UpdateTeamNameRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        String newName = (request.name() == null ? "" : request.name().trim());
        if (newName.isEmpty()) {
            throw new IllegalArgumentException("Team name must not be blank");
        }

        team.setName(newName);
        Team saved = teamRepository.save(team);

        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);
        return new TeamDTO(saved, members);
    }

    @Transactional
    public TeamDTO addMembers(UUID teamId, AddMembersRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        UUID generationId = team.getGenerationId();
        List<Long> participantIds = request.participantIds();
        if (participantIds == null || participantIds.isEmpty()) {
            List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);
            return new TeamDTO(team, members);
        }

        for (Long participantId : participantIds) {
            if (participantId == null) {
                continue;
            }

            // Ensure participant not already in some team in this generation
            if (teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, participantId)) {
                // You can choose to skip instead of throw, if you prefer.
                throw new IllegalStateException("Participant " + participantId + " is already in a team for this generation");
            }

            TeamMember tm = new TeamMember();
            tm.setTeamId(teamId);
            tm.setGenerationId(generationId);
            tm.setParticipantId(participantId);
            // snapshot fields can stay null for manual additions, or you can fill them later
            teamMemberRepository.save(tm);
        }

        List<TeamMember> updatedMembers = teamMemberRepository.findByTeamId(teamId);
        return new TeamDTO(team, updatedMembers);
    }

    @Transactional
    public TeamDTO removeMember(UUID teamId, Long participantId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        TeamMember member = teamMemberRepository
                .findByTeamIdAndParticipantId(teamId, participantId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Participant " + participantId + " is not in team " + teamId)
                );

        teamMemberRepository.delete(member);

        List<TeamMember> updatedMembers = teamMemberRepository.findByTeamId(teamId);
        return new TeamDTO(team, updatedMembers);
    }

    @Transactional
    public void moveMember(MoveMemberRequest request) {
        Long participantId = request.participantId();
        UUID targetTeamId = request.targetTeamId();

        Team targetTeam = teamRepository.findById(targetTeamId)
                .orElseThrow(() -> new IllegalArgumentException("Target team not found: " + targetTeamId));

        UUID generationId = targetTeam.getGenerationId();

        // Find any existing membership for this participant in the same generation
        var existingOpt = teamMemberRepository.findByGenerationIdAndParticipantId(generationId, participantId);

        if (existingOpt.isPresent()) {
            TeamMember existing = existingOpt.get();

            // Already in target team – nothing to do
            if (targetTeamId.equals(existing.getTeamId())) {
                return;
            }

            existing.setTeamId(targetTeamId);
            existing.setGenerationId(generationId);
            teamMemberRepository.save(existing);
        } else {
            // Not in any team for this generation: add new membership
            TeamMember tm = new TeamMember();
            tm.setTeamId(targetTeamId);
            tm.setGenerationId(generationId);
            tm.setParticipantId(participantId);
            teamMemberRepository.save(tm);
        }
    }

    // ---- Internal model for candidate scoring

    static class Candidate {
        Long participantId;
        String role;
        Set<String> skills;
        int motivation;
        int yearsExperience;
        String firstName;
        String lastName;

        static Candidate fromQuestionnaireAnswer(QuestionnaireAnswer questionnaireAnswer) {
            JsonNode data = questionnaireAnswer.getData();

            Candidate candidate = new Candidate();
            candidate.participantId = questionnaireAnswer.getParticipant().getId();
            candidate.firstName = data.path("first_name").asText(null);
            candidate.lastName = data.path("last_name").asText(null);
            candidate.role = safeLower(data.path("role").asText(null));
            candidate.motivation = asNonNegativeInt(data.path("motivation").asInt());
            candidate.yearsExperience = asNonNegativeInt(data.path("years_experience").asInt());

            Set<String> skillSet = new HashSet<>();
            String skillsRaw = data.path("skills").asText("");
            for (String rawSkill : skillsRaw.split("[,;]")) {
                String normalizedSkill = rawSkill.trim().toLowerCase();
                if (!normalizedSkill.isEmpty()) {
                    skillSet.add(normalizedSkill);
                }
            }
            candidate.skills = skillSet;

            return candidate;
        }

        private static String safeLower(String value) {
            return value == null ? null : value.trim().toLowerCase();
        }

        private static int asNonNegativeInt(Integer value) {
            return value == null || value < 0 ? 0 : value;
        }
    }

    static class TeamBuild {
        final String name;
        final List<Candidate> members = new ArrayList<>();
        double score = 0.0;

        TeamBuild(String name) {
            this.name = name;
        }

        void addMember(Candidate candidate) {
            members.add(candidate);
        }

        double calculateMarginalGain(Candidate candidateToAdd) {
            // Pairwise contribution with existing members
            double pairContribution = 0.0;
            for (Candidate existingMember : members) {
                pairContribution += pairScore(existingMember, candidateToAdd);
            }

            double bonusBefore = bonus();
            members.add(candidateToAdd);
            double bonusAfter = bonus();
            members.remove(members.size() - 1);

            return pairContribution + (bonusAfter - bonusBefore);
        }

        void recomputeScore() {
            double totalScore = 0.0;
            for (int i = 0; i < members.size(); i++) {
                for (int j = i + 1; j < members.size(); j++) {
                    totalScore += pairScore(members.get(i), members.get(j));
                }
            }
            totalScore += bonus();
            this.score = totalScore;
        }

        double bonus() {
            Set<String> rolesInTeam = new HashSet<>();
            Set<String> allSkillsInTeam = new HashSet<>();

            for (Candidate member : members) {
                if (member.role != null) {
                    rolesInTeam.add(member.role);
                }
                allSkillsInTeam.addAll(member.skills);
            }

            double bonusScore = 0.0;
            if (rolesInTeam.size() >= 3) {
                bonusScore += 0.2;
            }
            if (allSkillsInTeam.size() >= 8) {
                bonusScore += 0.1;
            }
            return bonusScore;
        }
    }

    private static double pairScore(Candidate a, Candidate b) {
        int motivationDifference = Math.abs(a.motivation - b.motivation);
        double motivationScore = 1.0 - (Math.min(4.0, motivationDifference) / 4.0);

        double skillsScore = jaccard(a.skills, b.skills);

        double roleBonus = (a.role != null && b.role != null && !a.role.equals(b.role)) ? 0.15 : 0.0;

        int expDifference = Math.abs(a.yearsExperience - b.yearsExperience);
        int range = Math.max(10, expDifference); // avoid division by very small numbers
        double experienceScore = 1.0 - (expDifference / (double) range);

        return 0.35 * motivationScore
                + 0.35 * skillsScore
                + 0.15 * roleBonus
                + 0.15 * experienceScore;
    }

    private static double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() && b.isEmpty()) {
            return 0.0;
        }
        int intersection = 0;
        for (String value : a) {
            if (b.contains(value)) {
                intersection++;
            }
        }
        int union = a.size() + b.size() - intersection;
        return union == 0 ? 0.0 : (double) intersection / union;
    }
}
