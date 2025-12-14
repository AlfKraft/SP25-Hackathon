package com.example.hackathonbe.team.service;

import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.common.exceptions.ConflictException;
import com.example.hackathonbe.common.exceptions.NotFoundException;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.hackathon.repository.QuestionnaireAnswerRepository;
import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import com.example.hackathonbe.team.dto.TeamDTO;
import com.example.hackathonbe.team.dto.TeamMemberDTO;
import com.example.hackathonbe.team.dto.TeamEditRequests.*;
import com.example.hackathonbe.team.model.Team;
import com.example.hackathonbe.team.model.TeamMember;
import com.example.hackathonbe.team.repository.TeamMemberRepository;
import com.example.hackathonbe.team.repository.TeamRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // =========================================================
    // Public API
    // =========================================================

    @Transactional
    public UUID generateTeams(Integer requestedTeamSize, Long hackathonId) {
        validateHackathonId(hackathonId);

        int targetTeamSize = normalizeTeamSize(requestedTeamSize);

        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));

        if (hackathon.getQuestionnaire() == null) {
            throw new ConflictException("Hackathon has no questionnaire. Cannot generate teams.");
        }

        List<Candidate> candidates = loadCandidates(hackathon);

        // Preserve your previous behavior: if no candidates, still return a generationId
        if (candidates.isEmpty()) {
            return UUID.randomUUID();
        }

        deleteExistingTeams(hackathonId);

        // Seeds: we want high motivation first; years helps second.
        candidates.sort(Comparator
                .comparingInt(Candidate::motivation).reversed()
                .thenComparingInt(Candidate::yearsExperience).reversed()
        );

        TeamLayout teamLayout = TeamLayout.compute(candidates.size(), targetTeamSize);

        List<TeamDraft> teamDrafts = seedTeams(candidates, teamLayout.numberOfTeams());

        assignRemainingCandidates(teamDrafts, candidates, teamLayout.maxSizesPerTeam());

        UUID generationId = UUID.randomUUID();
        persistTeams(hackathon, generationId, teamDrafts);

        return generationId;
    }

    @Transactional(readOnly = true)
    public List<TeamDTO> getTeams(Long hackathonId) {
        validateHackathonId(hackathonId);

        List<Team> teams = teamRepository.findByHackathonIdOrderByNameAsc(hackathonId);

        Set<Long> participantIds = teams.stream()
                .flatMap(team -> safeMembers(team).stream())
                .map(TeamMember::getParticipantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, ParticipantDto> participantsById = loadParticipantDtos(participantIds);

        return teams.stream()
                .map(team -> toTeamDTO(team, participantsById))
                .toList();
    }

    @Transactional
    public TeamDTO renameTeam(UUID teamId, UpdateTeamNameRequest request) {
        if (teamId == null) throw new BadRequestException("Team id is required");
        if (request == null) throw new BadRequestException("Request body is required");

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        String newName = request.name() == null ? "" : request.name().trim();
        if (newName.isBlank()) throw new BadRequestException("Team name must not be blank");

        team.setName(newName);
        Team savedTeam = teamRepository.save(team);

        return toTeamDTO(savedTeam);
    }

    @Transactional
    public TeamDTO addMembers(UUID teamId, AddMembersRequest request) {
        if (teamId == null) throw new BadRequestException("Team id is required");
        if (request == null) throw new BadRequestException("Request body is required");

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        UUID generationId = team.getGenerationId();
        if (generationId == null) {
            throw new ConflictException("Team has no generationId. Regenerate teams first.");
        }

        List<Long> participantIdsToAdd = request.participantIds();
        if (participantIdsToAdd == null || participantIdsToAdd.isEmpty()) {
            return toTeamDTO(team);
        }

        if (team.getMembers() == null) {
            team.setMembers(new ArrayList<>());
        }

        for (Long participantId : participantIdsToAdd) {
            if (participantId == null) continue;

            if (!participantRepository.existsById(participantId)) {
                throw new NotFoundException("Participant not found: " + participantId);
            }

            if (teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, participantId)) {
                throw new ConflictException("Participant " + participantId + " is already in a team for this generation");
            }

            TeamMember member = new TeamMember();
            member.setTeam(team);
            member.setGenerationId(generationId);
            member.setParticipantId(participantId);

            team.getMembers().add(member);
        }

        teamRepository.save(team);
        return toTeamDTO(team);
    }

    @Transactional
    public TeamDTO removeMember(UUID teamId, Long participantId) {
        if (teamId == null) throw new BadRequestException("Team id is required");
        if (participantId == null || participantId <= 0) throw new BadRequestException("Invalid participant id");

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        List<TeamMember> currentMembers = team.getMembers();
        if (currentMembers == null || currentMembers.isEmpty()) {
            throw new NotFoundException("Participant " + participantId + " is not in team " + teamId);
        }

        TeamMember memberToRemove = currentMembers.stream()
                .filter(member -> Objects.equals(member.getParticipantId(), participantId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Participant " + participantId + " is not in team " + teamId));

        currentMembers.remove(memberToRemove);
        teamRepository.save(team);

        return toTeamDTO(team);
    }

    @Transactional
    public void moveMember(MoveMemberRequest request) {
        if (request == null) throw new BadRequestException("Request body is required");

        UUID fromTeamId = request.fromTeamId();
        UUID toTeamId = request.toTeamId();
        Long participantId = request.participantId();

        if (fromTeamId == null || toTeamId == null) {
            throw new BadRequestException("fromTeamId and toTeamId are required");
        }
        if (participantId == null || participantId <= 0) {
            throw new BadRequestException("Invalid participant id");
        }
        if (fromTeamId.equals(toTeamId)) {
            return;
        }

        Team targetTeam = teamRepository.findById(toTeamId)
                .orElseThrow(() -> new NotFoundException("Target team not found: " + toTeamId));

        UUID generationId = targetTeam.getGenerationId();
        if (generationId == null) {
            throw new ConflictException("Target team has no generationId");
        }

        TeamMember membership = teamMemberRepository
                .findByGenerationIdAndParticipantId(generationId, participantId)
                .orElseThrow(() -> new NotFoundException(
                        "Participant " + participantId + " is not in any team for generation " + generationId
                ));

        Team originTeam = membership.getTeam();
        if (originTeam == null) {
            throw new ConflictException("Team membership is corrupted for participant: " + participantId);
        }
        if (!originTeam.getId().equals(fromTeamId)) {
            throw new BadRequestException("Participant " + participantId + " is not in team " + fromTeamId);
        }

        membership.setTeam(targetTeam);
        teamMemberRepository.save(membership);

        recalcScoreForTeam(originTeam.getId());
        recalcScoreForTeam(targetTeam.getId());
    }

    @Transactional
    public void deleteTeam(UUID teamId) {
        if (teamId == null) throw new BadRequestException("Team id is required");

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        teamRepository.delete(team);
    }

    // =========================================================
    // Persistence + DTO mapping
    // =========================================================

    private TeamDTO toTeamDTO(Team team) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(team.getId());

        Set<Long> participantIds = members.stream()
                .map(TeamMember::getParticipantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, ParticipantDto> participantsById = loadParticipantDtos(participantIds);

        List<TeamMemberDTO> memberDtos = members.stream()
                .map(member -> {
                    ParticipantDto participantDto = participantsById.get(member.getParticipantId());
                    if (participantDto == null) {
                        throw new NotFoundException("Participant not found: " + member.getParticipantId());
                    }
                    return new TeamMemberDTO(member, participantDto);
                })
                .toList();

        return new TeamDTO(team, memberDtos);
    }

    private TeamDTO toTeamDTO(Team team, Map<Long, ParticipantDto> participantsById) {
        List<TeamMemberDTO> memberDtos = safeMembers(team).stream()
                .map(member -> {
                    ParticipantDto participantDto = participantsById.get(member.getParticipantId());
                    if (participantDto == null) {
                        throw new NotFoundException("Participant not found: " + member.getParticipantId());
                    }
                    return new TeamMemberDTO(member, participantDto);
                })
                .toList();

        return new TeamDTO(team, memberDtos);
    }

    private Map<Long, ParticipantDto> loadParticipantDtos(Set<Long> participantIds) {
        if (participantIds == null || participantIds.isEmpty()) return Map.of();

        return participantRepository.findAllById(participantIds)
                .stream()
                .collect(Collectors.toMap(
                        Participant::getId,
                        ParticipantDto::new
                ));
    }

    // =========================================================
    // Score recalculation
    // =========================================================

    private void recalcScoreForTeam(UUID teamId) {
        if (teamId == null) return;

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);

        List<Candidate> candidates = members.stream()
                .map(this::candidateFromSnapshots)
                .toList();

        team.setScore(TeamCompatibilityScoring.teamCompatibilityScore(candidates));
        teamRepository.save(team);
    }

    private Candidate candidateFromSnapshots(TeamMember member) {
        Candidate candidate = new Candidate();
        candidate.setParticipantId(member.getParticipantId());
        candidate.setRole(member.getRoleSnapshot());
        candidate.setMotivation(valueOrZero(member.getMotivationSnapshot()));
        candidate.setYearsExperience(valueOrZero(member.getYearsExperienceSnapshot()));
        candidate.setSkills(SkillParsing.parseSkillsFromCommaSeparatedText(member.getSkillsSnapshot()));
        return candidate;
    }

    private static int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    // =========================================================
    // Team generation internals
    // =========================================================

    private List<Candidate> loadCandidates(Hackathon hackathon) {
        List<Candidate> candidates = new ArrayList<>();

        for (Participant participant : hackathon.getParticipants()) {
            QuestionnaireAnswer questionnaireAnswer = questionnaireAnswerRepository
                    .findByQuestionnaireAndParticipant(hackathon.getQuestionnaire(), participant)
                    .orElse(null);

            if (questionnaireAnswer == null) {
                continue; // skip participants without answers
            }

            candidates.add(Candidate.fromQuestionnaireAnswer(questionnaireAnswer));
        }

        return candidates;
    }

    private void deleteExistingTeams(Long hackathonId) {
        List<Team> existingTeams = teamRepository.findByHackathonId(hackathonId);
        if (!existingTeams.isEmpty()) {
            teamRepository.deleteAll(existingTeams);
        }
    }

    private List<TeamDraft> seedTeams(List<Candidate> sortedCandidates, int numberOfTeams) {
        int seedCount = Math.min(numberOfTeams, sortedCandidates.size());
        List<TeamDraft> drafts = new ArrayList<>(seedCount);

        for (int teamIndex = 0; teamIndex < seedCount; teamIndex++) {
            TeamDraft teamDraft = new TeamDraft("Team " + (teamIndex + 1));
            teamDraft.addMember(sortedCandidates.get(teamIndex));
            drafts.add(teamDraft);
        }
        return drafts;
    }

    private void assignRemainingCandidates(
            List<TeamDraft> teamDrafts,
            List<Candidate> allCandidatesSorted,
            List<Integer> maxSizesPerTeam
    ) {
        Set<Long> alreadyAssignedParticipantIds = teamDrafts.stream()
                .flatMap(draft -> draft.getMembers().stream())
                .map(Candidate::participantId)
                .collect(Collectors.toSet());

        List<Candidate> unassignedCandidates = allCandidatesSorted.stream()
                .filter(candidate -> !alreadyAssignedParticipantIds.contains(candidate.participantId()))
                .toList();

        for (Candidate candidate : unassignedCandidates) {
            TeamDraft bestDraft = null;
            double bestScoreGain = Double.NEGATIVE_INFINITY;

            for (int teamIndex = 0; teamIndex < teamDrafts.size(); teamIndex++) {
                TeamDraft draft = teamDrafts.get(teamIndex);
                int maxTeamSize = maxSizesPerTeam.get(teamIndex);

                if (draft.getMembers().size() >= maxTeamSize) {
                    continue;
                }

                double scoreGain = TeamCompatibilityScoring.gain(draft.getMembers(), candidate);

                // small nudge to keep teams balanced when gains are equal-ish
                scoreGain -= 0.02 * draft.getMembers().size();

                if (scoreGain > bestScoreGain) {
                    bestScoreGain = scoreGain;
                    bestDraft = draft;
                }
            }

            if (bestDraft != null) {
                bestDraft.addMember(candidate);
            } else {
                log.warn("No team had capacity for candidate {}", candidate.participantId());
            }
        }
    }

    private void persistTeams(Hackathon hackathon, UUID generationId, List<TeamDraft> teamDrafts) {
        for (TeamDraft draft : teamDrafts) {
            Team team = new Team();
            team.setName(draft.getName());
            team.setHackathon(hackathon);
            team.setGenerationId(generationId);
            team.setScore(TeamCompatibilityScoring.teamCompatibilityScore(draft.getMembers()));

            if (team.getMembers() == null) {
                team.setMembers(new ArrayList<>());
            }

            for (Candidate candidate : draft.getMembers()) {
                TeamMember member = new TeamMember();
                member.setTeam(team);
                member.setGenerationId(generationId);
                member.setParticipantId(candidate.participantId());

                member.setRoleSnapshot(candidate.role());
                member.setMotivationSnapshot(candidate.motivation());
                member.setYearsExperienceSnapshot(candidate.yearsExperience());
                member.setSkillsSnapshot(String.join(", ", candidate.skills()));

                team.getMembers().add(member);
            }

            teamRepository.save(team);
        }
    }

    // =========================================================
    // Validation helpers
    // =========================================================

    private static void validateHackathonId(Long hackathonId) {
        if (hackathonId == null || hackathonId <= 0) {
            throw new BadRequestException("Invalid hackathon id");
        }
    }

    private static int normalizeTeamSize(Integer requestedTeamSize) {
        // Keep your original guard: minimum 3, default 4
        if (requestedTeamSize == null || requestedTeamSize < 3) return 4;
        return requestedTeamSize;
    }

    private static List<TeamMember> safeMembers(Team team) {
        if (team.getMembers() == null) return List.of();
        return team.getMembers();
    }

    // =========================================================
    // Data structures
    // =========================================================

    private static final class TeamLayout {
        private final int numberOfTeams;
        private final List<Integer> maxSizesPerTeam;

        private TeamLayout(int numberOfTeams, List<Integer> maxSizesPerTeam) {
            this.numberOfTeams = numberOfTeams;
            this.maxSizesPerTeam = maxSizesPerTeam;
        }

        public int numberOfTeams() {
            return numberOfTeams;
        }

        public List<Integer> maxSizesPerTeam() {
            return maxSizesPerTeam;
        }

        static TeamLayout compute(int totalCandidates, int targetTeamSize) {
            int computedNumberOfTeams = (int) Math.ceil((double) totalCandidates / (double) targetTeamSize);
            computedNumberOfTeams = Math.max(1, computedNumberOfTeams);

            int baseSize = totalCandidates / computedNumberOfTeams;
            int extra = totalCandidates % computedNumberOfTeams;

            List<Integer> computedMaxSizes = new ArrayList<>(computedNumberOfTeams);
            for (int teamIndex = 0; teamIndex < computedNumberOfTeams; teamIndex++) {
                int maxSize = baseSize + (teamIndex < extra ? 1 : 0);
                computedMaxSizes.add(maxSize);
            }

            return new TeamLayout(computedNumberOfTeams, computedMaxSizes);
        }
    }

    private static final class TeamDraft {
        private final String name;
        private final List<Candidate> members = new ArrayList<>();

        private TeamDraft(String name) {
            this.name = name;
        }

        public String getName() {
            return name;
        }

        public List<Candidate> getMembers() {
            return members;
        }

        public void addMember(Candidate candidate) {
            this.members.add(candidate);
        }
    }

    private static final class Candidate {
        private Long participantId;
        private String role;
        private Set<String> skills = Set.of();
        private int motivation;
        private int yearsExperience;
        private String firstName;
        private String lastName;

        public Long participantId() { return participantId; }
        public String role() { return role; }
        public Set<String> skills() { return skills; }
        public int motivation() { return motivation; }
        public int yearsExperience() { return yearsExperience; }
        public String firstName() { return firstName; }
        public String lastName() { return lastName; }

        public void setParticipantId(Long participantId) { this.participantId = participantId; }
        public void setRole(String role) { this.role = role; }
        public void setSkills(Set<String> skills) { this.skills = skills == null ? Set.of() : skills; }
        public void setMotivation(int motivation) { this.motivation = motivation; }
        public void setYearsExperience(int yearsExperience) { this.yearsExperience = yearsExperience; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public void setLastName(String lastName) { this.lastName = lastName; }

        static Candidate fromQuestionnaireAnswer(QuestionnaireAnswer questionnaireAnswer) {
            JsonNode data = questionnaireAnswer.getData();

            Candidate candidate = new Candidate();
            candidate.setParticipantId(questionnaireAnswer.getParticipant().getId());

            // Internal questionnaire: array of answers with key/valueText/valueNumber
            if (data != null && data.isArray()) {
                Map<String, JsonNode> answersByKey = new HashMap<>();
                for (JsonNode answerItem : data) {
                    String key = answerItem.path("key").asText("");
                    if (!key.isBlank()) {
                        answersByKey.put(key, answerItem);
                    }
                }

                candidate.setFirstName(JsonAnswerParsing.getTextValue(answersByKey, "first_name"));
                candidate.setLastName(JsonAnswerParsing.getTextValue(answersByKey, "last_name"));
                candidate.setRole(TextNormalization.safeLower(JsonAnswerParsing.getTextValue(answersByKey, "role")));
                candidate.setMotivation(Math.max(0, JsonAnswerParsing.getNumberValue(answersByKey, "motivation")));
                candidate.setYearsExperience(Math.max(0, JsonAnswerParsing.getNumberValue(answersByKey, "years_experience")));

                String skillsText = JsonAnswerParsing.getTextValue(answersByKey, "skills");
                candidate.setSkills(SkillParsing.parseSkillsFromCommaSeparatedText(skillsText));

                return candidate;
            }

            // External questionnaire: flat object
            candidate.setFirstName(data.path("first_name").asText(null));
            candidate.setLastName(data.path("last_name").asText(null));
            candidate.setRole(TextNormalization.safeLower(data.path("role").asText(null)));
            candidate.setMotivation(Math.max(0, data.path("motivation").asInt()));
            candidate.setYearsExperience(Math.max(0, data.path("years_experience").asInt()));

            JsonNode skillsNode = data.path("skills");
            if (skillsNode.isArray()) {
                Set<String> skills = new HashSet<>();
                for (JsonNode skillItem : skillsNode) {
                    String skill = skillItem.asText("").trim();
                    if (!skill.isBlank()) skills.add(skill);
                }
                candidate.setSkills(skills);
            } else {
                candidate.setSkills(SkillParsing.parseSkillsFromCommaSeparatedText(skillsNode.asText("")));
            }

            return candidate;
        }
    }

    private static final class JsonAnswerParsing {
        private JsonAnswerParsing() {}

        static String getTextValue(Map<String, JsonNode> answersByKey, String key) {
            JsonNode node = answersByKey.get(key);
            if (node == null) return null;

            String value = node.path("valueText").asText(null);
            if (value == null) return null;

            String trimmed = value.trim();
            return trimmed.isBlank() ? null : trimmed;
        }

        static int getNumberValue(Map<String, JsonNode> answersByKey, String key) {
            JsonNode node = answersByKey.get(key);
            if (node == null) return 0;
            return node.path("valueNumber").asInt(0);
        }
    }

    private static final class SkillParsing {
        private SkillParsing() {}

        static Set<String> parseSkillsFromCommaSeparatedText(String rawText) {
            if (rawText == null) return Set.of();

            return Arrays.stream(rawText.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .collect(Collectors.toSet());
        }
    }

    private static final class TextNormalization {
        private TextNormalization() {}

        static String safeLower(String text) {
            if (text == null) return null;
            String trimmed = text.trim();
            return trimmed.isBlank() ? null : trimmed.toLowerCase(Locale.ROOT);
        }
    }

    // =========================================================
    // Compatibility scoring (0..5)
    // =========================================================

    private static final class TeamCompatibilityScoring {

        private TeamCompatibilityScoring() {}

        // weights (must sum to 1.0)
        private static final double WEIGHT_MOTIVATION = 0.55;
        private static final double WEIGHT_EXPERIENCE = 0.20;
        private static final double WEIGHT_ROLE_VARIETY = 0.15;
        private static final double WEIGHT_SKILL_VARIETY = 0.10;

        static double gain(List<Candidate> currentTeam, Candidate candidateToAdd) {
            double before = teamCompatibilityScore(currentTeam);

            List<Candidate> nextTeam = new ArrayList<>(currentTeam);
            nextTeam.add(candidateToAdd);

            double after = teamCompatibilityScore(nextTeam);
            return after - before;
        }

        static double teamCompatibilityScore(List<Candidate> members) {
            if (members == null || members.isEmpty()) return 0.0;

            double motivationScore = motivationScore(members);
            double experienceScore = experienceScore(members);
            double roleVarietyScore = roleVarietyScore(members);
            double skillVarietyScore = skillVarietyScore(members);

            double weighted =
                    WEIGHT_MOTIVATION * motivationScore +
                            WEIGHT_EXPERIENCE * experienceScore +
                            WEIGHT_ROLE_VARIETY * roleVarietyScore +
                            WEIGHT_SKILL_VARIETY * skillVarietyScore;

            return roundToTwoDecimals(clamp01(weighted) * 5.0);
        }

        private static double motivationScore(List<Candidate> members) {
            List<Double> normalized = members.stream()
                    .map(candidate -> normalizeMotivation(candidate.motivation()))
                    .toList();

            double average = normalized.stream().mapToDouble(value -> value).average().orElse(0.0);
            double cohesion = cohesionFromStandardDeviation(normalized, 0.25);

            return clamp01(0.7 * average + 0.3 * cohesion);
        }

        private static double experienceScore(List<Candidate> members) {
            List<Double> normalized = members.stream()
                    .map(candidate -> normalizeYears(candidate.yearsExperience()))
                    .toList();

            double average = normalized.stream().mapToDouble(value -> value).average().orElse(0.0);
            double cohesion = cohesionFromStandardDeviation(normalized, 0.35);

            return clamp01(0.6 * average + 0.4 * cohesion);
        }

        private static double roleVarietyScore(List<Candidate> members) {
            int teamSize = members.size();

            Set<String> uniqueRoles = members.stream()
                    .map(candidate -> normalizeRole(candidate.role()))
                    .filter(role -> !role.isBlank())
                    .collect(Collectors.toSet());

            if (uniqueRoles.isEmpty()) return 0.4;

            return clamp01(uniqueRoles.size() / (double) teamSize);
        }

        private static double skillVarietyScore(List<Candidate> members) {
            int teamSize = members.size();

            Set<String> uniqueSkills = new HashSet<>();
            for (Candidate candidate : members) {
                uniqueSkills.addAll(normalizeSkills(candidate.skills()));
            }

            if (uniqueSkills.isEmpty()) return 0.3;

            double target = 3.0 * teamSize; // heuristic
            return clamp01(uniqueSkills.size() / target);
        }

        private static double cohesionFromStandardDeviation(List<Double> values, double sdThreshold) {
            if (values.isEmpty()) return 0.0;

            double average = values.stream().mapToDouble(value -> value).average().orElse(0.0);
            double variance = values.stream()
                    .mapToDouble(value -> (value - average) * (value - average))
                    .average()
                    .orElse(0.0);

            double standardDeviation = Math.sqrt(variance);
            return clamp01(1.0 - (standardDeviation / sdThreshold));
        }

        private static double normalizeMotivation(int motivation) {
            int clamped = Math.max(1, Math.min(10, motivation));
            return (clamped - 1) / 9.0;
        }

        private static double normalizeYears(int yearsExperience) {
            int clamped = Math.max(0, yearsExperience);
            double capped = Math.min(20.0, clamped);
            return capped / 20.0;
        }

        private static String normalizeRole(String role) {
            return role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        }

        private static Set<String> normalizeSkills(Set<String> skills) {
            if (skills == null || skills.isEmpty()) return Set.of();

            return skills.stream()
                    .filter(Objects::nonNull)
                    .map(value -> value.trim().toLowerCase(Locale.ROOT))
                    .filter(value -> !value.isBlank())
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }

        private static double clamp01(double value) {
            return Math.max(0.0, Math.min(1.0, value));
        }

        private static double roundToTwoDecimals(double value) {
            return Math.round(value * 100.0) / 100.0;
        }
    }
}
