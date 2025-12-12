package com.example.hackathonbe.team.service;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.hackathon.repository.QuestionnaireAnswerRepository;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import com.example.hackathonbe.team.dto.TeamDTO;
import com.example.hackathonbe.team.dto.TeamMemberDTO;
import com.example.hackathonbe.team.model.Team;
import com.example.hackathonbe.team.model.TeamMember;
import com.example.hackathonbe.team.repository.TeamMemberRepository;
import com.example.hackathonbe.team.repository.TeamRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.hackathonbe.team.dto.TeamEditRequests.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final HackathonRepository hackathonRepository;
    private final QuestionnaireAnswerRepository questionnaireAnswerRepository;
    private final ParticipantRepository participantRepository;

    @Transactional
    public UUID generateTeams(Integer requestedTeamSize, Long hackathonId) {
        int targetTeamSize = (requestedTeamSize == null || requestedTeamSize < 3) ? 4 : requestedTeamSize;

        // 1) Load hackathon & candidates
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
            // Nothing to generate, but still return a generationId for consistency
            return UUID.randomUUID();
        }

        // 2) Delete previous teams for this hackathon.
        //    Because of cascade = ALL + orphanRemoval on Team.members,
        //    all TeamMember rows for these Teams will be deleted automatically.
        List<Team> existingTeams = teamRepository.findByHackathonId(hackathonId);
        if (!existingTeams.isEmpty()) {
            teamRepository.deleteAll(existingTeams);
        }

        // 3) Sort candidates by strength (motivation + years of experience)
        candidates.sort(Comparator.comparingInt(
                (Candidate c) -> c.motivation + c.yearsExperience
        ).reversed());

        int totalCandidates = candidates.size();

        // 4) Compute number of teams and balanced max sizes
        //    Example: 15 participants, targetTeamSize=4
        //      numberOfTeams = ceil(15 / 4) = 4
        //      baseSize = 15 / 4 = 3
        //      extra   = 15 % 4 = 3  -> sizes: 4,4,4,3
        int numberOfTeams = (int) Math.ceil((double) totalCandidates / (double) targetTeamSize);
        numberOfTeams = Math.max(1, numberOfTeams);

        int baseSize = totalCandidates / numberOfTeams;   // minimum size for each team
        int extra = totalCandidates % numberOfTeams;      // first 'extra' teams get baseSize + 1

        List<Integer> teamMaxSizes = new ArrayList<>(numberOfTeams);
        for (int i = 0; i < numberOfTeams; i++) {
            int maxSize = baseSize + (i < extra ? 1 : 0);
            teamMaxSizes.add(maxSize);
        }

        // 5) Seed teams with strongest candidates
        List<TeamBuild> teamBuilds = new ArrayList<>();
        for (int i = 0; i < numberOfTeams && i < totalCandidates; i++) {
            TeamBuild teamBuild = new TeamBuild("Team " + (i + 1));
            teamBuild.addMember(candidates.get(i)); // one strong seed per team
            teamBuilds.add(teamBuild);
        }

        // 6) Assign remaining candidates while respecting per-team max sizes
        Set<Long> alreadyAssignedParticipantIds = teamBuilds.stream()
                .flatMap(tb -> tb.members.stream())
                .map(c -> c.participantId)
                .collect(Collectors.toSet());

        List<Candidate> unassignedCandidates = candidates.stream()
                .filter(c -> !alreadyAssignedParticipantIds.contains(c.participantId))
                .toList();

        for (Candidate candidate : unassignedCandidates) {
            TeamBuild bestTeam = null;
            double bestGain = Double.NEGATIVE_INFINITY;

            // Prefer teams that are not yet at their max size
            for (int i = 0; i < teamBuilds.size(); i++) {
                TeamBuild teamBuild = teamBuilds.get(i);
                int maxSize = teamMaxSizes.get(i);

                if (teamBuild.members.size() >= maxSize) {
                    continue; // team full
                }

                double gain = teamBuild.calculateMarginalGain(candidate);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestTeam = teamBuild;
                }
            }

            // Fallback: if somehow all are "full", place in best-fitting team anyway
            if (bestTeam == null) {
                bestTeam = teamBuilds.stream()
                        .max(Comparator.comparingDouble(tb -> tb.calculateMarginalGain(candidate)))
                        .orElse(teamBuilds.get(0));
            }

            bestTeam.addMember(candidate);
        }

        // 7) Recompute final scores
        for (TeamBuild teamBuild : teamBuilds) {
            teamBuild.recomputeScore();
        }

        // 8) Persist new generation of teams & members
        UUID generationId = UUID.randomUUID();

        for (TeamBuild teamBuild : teamBuilds) {
            Team team = new Team();
            team.setName(teamBuild.name);
            team.setScore(teamBuild.score);
            team.setGenerationId(generationId);
            team.setHackathon(hackathon);

            // build members and attach via the association
            for (Candidate candidate : teamBuild.members) {
                TeamMember member = new TeamMember();
                member.setTeam(team);  // important: use the entity, not an ID
                member.setGenerationId(generationId);
                member.setParticipantId(candidate.participantId);
                member.setRoleSnapshot(candidate.role);
                member.setSkillsSnapshot(String.join(";", candidate.skills));
                member.setMotivationSnapshot(candidate.motivation);
                member.setYearsExperienceSnapshot(candidate.yearsExperience);

                team.getMembers().add(member);
            }

            // cascade = ALL on Team.members will persist TeamMember entities
            teamRepository.save(team);
        }

        return generationId;
    }


    @Transactional(readOnly = true)
    public List<TeamDTO> getTeams(Long hackathonId) {
        List<Team> teams = teamRepository.findByHackathonIdOrderByNameAsc(hackathonId);

        // Collect all participantIds used in team members for this hackathon
        Set<Long> participantIds = teams.stream()
                .flatMap(team -> {
                    List<TeamMember> members = team.getMembers() != null
                            ? team.getMembers()
                            : List.of();
                    return members.stream();
                })
                .map(TeamMember::getParticipantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // Bulk fetch Participants to avoid N+1
        Map<Long, ParticipantDto> participantsById = participantRepository.findAllById(participantIds)
                .stream()
                .collect(Collectors.toMap(
                        Participant::getId,
                        ParticipantDto::new   // assumes ParticipantDto(Participant) constructor
                ));

        // Build TeamDTOs with TeamMemberDTOs
        return teams.stream()
                .map(team -> {
                    List<TeamMember> members = team.getMembers() != null
                            ? team.getMembers()
                            : List.of();

                    List<TeamMemberDTO> memberDtos = members.stream()
                            .map(m -> {
                                ParticipantDto p = participantsById.get(m.getParticipantId());
                                return new TeamMemberDTO(m, p);
                            })
                            .toList();

                    return new TeamDTO(team, memberDtos);
                })
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

        return toTeamDTO(saved);
    }


    @Transactional
    public TeamDTO addMembers(UUID teamId, AddMembersRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        UUID generationId = team.getGenerationId();
        List<Long> participantIds = request.participantIds();

        // If nothing to add, just return current DTO
        if (participantIds == null || participantIds.isEmpty()) {
            return toTeamDTO(team);
        }

        // Make sure members collection is initialized
        if (team.getMembers() == null) {
            team.setMembers(new ArrayList<>());
        }

        for (Long participantId : participantIds) {
            if (participantId == null) {
                continue;
            }

            // Ensure participant not already in some team in this generation
            if (teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, participantId)) {
                throw new IllegalStateException(
                        "Participant " + participantId + " is already in a team for this generation"
                );
            }

            TeamMember tm = new TeamMember();
            tm.setTeam(team);
            tm.setGenerationId(generationId);
            tm.setParticipantId(participantId);
            // snapshot fields can stay null or you can fill them from Participant if you want

            team.getMembers().add(tm);
        }

        teamRepository.save(team);

        return toTeamDTO(team);   // ✅ mapped with participants
    }



    @Transactional
    public TeamDTO removeMember(UUID teamId, Long participantId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        if (team.getMembers() == null) {
            throw new IllegalArgumentException(
                    "Participant " + participantId + " is not in team " + teamId
            );
        }

        TeamMember toRemove = team.getMembers().stream()
                .filter(m -> Objects.equals(m.getParticipantId(), participantId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Participant " + participantId + " is not in team " + teamId
                ));

        team.getMembers().remove(toRemove); // orphanRemoval will delete row
        teamRepository.save(team);

        return toTeamDTO(team);   // ✅ TeamDTO with fresh members + participants
    }



    @Transactional
    public void moveMember(MoveMemberRequest request) {
        UUID fromTeamId = request.fromTeamId();
        UUID targetTeamId = request.toTeamId();
        Long participantId = request.participantId();

        if (fromTeamId.equals(targetTeamId)) {
            // Nothing to do
            return;
        }

        Team targetTeam = teamRepository.findById(targetTeamId)
                .orElseThrow(() -> new IllegalArgumentException("Target team not found: " + targetTeamId));

        UUID generationId = targetTeam.getGenerationId();

        // Find membership in this generation
        TeamMember teamMember = teamMemberRepository
                .findByGenerationIdAndParticipantId(generationId, participantId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Participant " + participantId + " is not in any team for generation " + generationId
                ));

        Team originTeam = teamMember.getTeam();
        if (!originTeam.getId().equals(fromTeamId)) {
            throw new IllegalArgumentException(
                    "Participant " + participantId + " is not in team " + fromTeamId
            );
        }

        // ✅ Only update owning side; do NOT touch collections
        teamMember.setTeam(targetTeam);
        teamMemberRepository.save(teamMember);

        // 🔁 Recompute scores from fresh membership
        recalcScoreForTeam(originTeam.getId());
        recalcScoreForTeam(targetTeam.getId());
    }

    private TeamDTO toTeamDTO(Team team) {
        // 1) Load members for this team
        List<TeamMember> members = teamMemberRepository.findByTeamId(team.getId());

        // 2) Collect participant IDs
        Set<Long> participantIds = members.stream()
                .map(TeamMember::getParticipantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // 3) Bulk-load participants and map to DTOs
        Map<Long, ParticipantDto> participantsById = participantRepository.findAllById(participantIds)
                .stream()
                .collect(Collectors.toMap(
                        Participant::getId,
                        ParticipantDto::new      // assumes ParticipantDto(Participant) ctor
                ));

        // 4) Build member DTOs
        List<TeamMemberDTO> memberDtos = members.stream()
                .map(m -> {
                    ParticipantDto p = participantsById.get(m.getParticipantId());
                    return new TeamMemberDTO(m, p);
                })
                .toList();

        // 5) Finally wrap into TeamDTO
        return new TeamDTO(team, memberDtos);
    }

    public void deleteTeam(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        teamRepository.delete(team);
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

            JsonNode skillsNode = data.path("skills");
            Set<String> skillSet = new HashSet<>();

            if (skillsNode.isArray()) {
                for (JsonNode n : skillsNode) {
                    String s = n.asText("").trim();
                    if (!s.isEmpty()) skillSet.add(s);
                }
            } else {
                // fallback for comma-separated string (legacy or malformed)
                String skillsRaw = skillsNode.asText("");
                for (String raw : skillsRaw.split("[,;]")) {
                    String s = raw.trim();
                    if (!s.isEmpty()) skillSet.add(s);
                }
            }
            candidate.skills = skillSet;

            return candidate;
        }
        static Candidate fromTeamMember(TeamMember member) {
            Candidate candidate = new Candidate();
            candidate.participantId = member.getParticipantId();
            candidate.role = safeLower(member.getRoleSnapshot());

            Set<String> skillSet = new HashSet<>();
            String skillsRaw = Optional.ofNullable(member.getSkillsSnapshot()).orElse("");
            for (String rawSkill : skillsRaw.split("[,;]")) {
                String normalizedSkill = rawSkill.trim().toLowerCase();
                if (!normalizedSkill.isEmpty()) {
                    skillSet.add(normalizedSkill);
                }
            }
            candidate.skills = skillSet;

            candidate.motivation = asNonNegativeInt(member.getMotivationSnapshot());
            candidate.yearsExperience = asNonNegativeInt(member.getYearsExperienceSnapshot());
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

    private void recalcScoreForTeam(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);

        TeamBuild build = new TeamBuild(team.getName());

        for (TeamMember tm : members) {
            Candidate c = Candidate.fromTeamMember(tm); // the helper we added earlier
            build.addMember(c);
        }

        build.recomputeScore();
        team.setScore(build.score);
        teamRepository.save(team);
    }

}
