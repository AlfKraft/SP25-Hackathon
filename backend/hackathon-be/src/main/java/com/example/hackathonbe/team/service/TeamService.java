package com.example.hackathonbe.team.service;

import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.common.exceptions.ConflictException;
import com.example.hackathonbe.common.exceptions.NotFoundException;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.hackathon.model.QuestionnaireSource;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.hackathon.repository.QuestionnaireAnswerRepository;
import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import com.example.hackathonbe.team.dto.TeamDTO;
import com.example.hackathonbe.team.dto.TeamEditRequests.AddMembersRequest;
import com.example.hackathonbe.team.dto.TeamEditRequests.MoveMemberRequest;
import com.example.hackathonbe.team.dto.TeamEditRequests.UpdateTeamNameRequest;
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
    // Deletion
    // =========================================================
    @Transactional
    public void deleteTeam(UUID teamId) {
        if (teamId == null) {
            throw new BadRequestException("Team id is required");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        teamRepository.delete(team);
    }

    // =========================================================
    // Teams generation (NEW CLIENT LOGIC)
    // =========================================================

    /**
     * New logic requested by client:
     * - Team 1: pack the most motivated participants together (power team),
     *   but still maximize role and common-skill variety.
     * - Remaining teams: filled in descending motivation "bands", still with variety.
     */
    @Transactional
    public UUID generateTeams(Integer requestedTeamSize, Long hackathonId) {
        validateHackathonId(hackathonId);

        int targetTeamSize = normalizeTeamSize(requestedTeamSize);

        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));

        Questionnaire questionnaire = hackathon.getQuestionnaire();
        if (questionnaire == null) {
            throw new ConflictException("Hackathon has no questionnaire. Cannot generate teams.");
        }

        OptionLabelIndex optionIndex = OptionLabelIndex.from(questionnaire.getQuestions());

        List<Candidate> rawCandidates = loadCandidates(hackathon, optionIndex);

        UUID generationId = UUID.randomUUID();
        if (rawCandidates.isEmpty()) return generationId;

        deleteExistingTeams(hackathonId);

        // Sort by motivation desc (then experience desc) once
        rawCandidates.sort(Comparator
                .comparingInt(Candidate::motivation).reversed()
                .thenComparingInt(Candidate::yearsExperience).reversed()
        );

        // Compute how many teams and their capacities
        TeamLayout layout = TeamLayout.compute(rawCandidates.size(), targetTeamSize);

        // Build role/skill buckets:
        // - Internal has stable option labels
        // - Imported can be messy, so we learn most common normalized values too
        RoleSkillBucketer bucketer = RoleSkillBucketer.build(rawCandidates);

        // Convert to bucketed candidates for team selection
        List<BucketedCandidate> candidates = rawCandidates.stream()
                .map(c -> BucketedCandidate.from(c, bucketer))
                .toList();

        // Build teams sequentially:
        // Team 1 is the "power team": use a larger top window to ensure "most motivated"
        List<TeamDraft2> drafts = new ArrayList<>();
        Set<Long> used = new HashSet<>();

        int teamCount = layout.numberOfTeams();
        List<Integer> capacities = layout.maxSizesPerTeam();

        for (int teamIndex = 0; teamIndex < teamCount; teamIndex++) {
            int capacity = capacities.get(teamIndex);
            String teamName = "Team " + (teamIndex + 1);

            TeamDraft2 draft = new TeamDraft2(teamName, capacity);

            // Window size:
            // - Power team considers more top candidates to optimize variety without dropping motivation too much.
            // - Other teams consider a smaller band, keeping motivation high per team.
            int window = (teamIndex == 0)
                    ? Math.min(candidates.size(), capacity * 5)  // power team: bigger pool
                    : Math.min(candidates.size(), capacity * 3); // other teams: banded

            fillTeamGreedy(
                    draft,
                    candidates,
                    used,
                    window,
                    teamIndex == 0 // powerTeam flag influences weights
            );

            drafts.add(draft);
        }

        // Persist teams + snapshot labels
        persistTeams2(hackathon, generationId, drafts);

        return generationId;
    }

    /**
     * Greedy fill:
     * - always picks from top 'window' highest-motivation remaining candidates
     * - objective heavily favors motivation, with bonuses for adding a new role bucket and common skill buckets
     */
    private void fillTeamGreedy(
            TeamDraft2 team,
            List<BucketedCandidate> sortedCandidates,
            Set<Long> used,
            int window,
            boolean powerTeam
    ) {
        // If no one yet: seed with highest motivation not used
        BucketedCandidate seed = sortedCandidates.stream()
                .filter(c -> !used.contains(c.participantId()))
                .filter(c -> !powerTeam || c.motivation() >= 3)
                .findFirst()
                .orElse(null);
        if (seed == null) return;

        team.add(seed);
        used.add(seed.participantId());

        while (!team.isFull()) {
            BucketedCandidate best = null;
            double bestScore = Double.NEGATIVE_INFINITY;

            // only consider the top window (to keep motivation high)
            int limit = Math.min(sortedCandidates.size(), window);
            for (int i = 0; i < limit; i++) {
                BucketedCandidate c = sortedCandidates.get(i);
                if (used.contains(c.participantId())) continue;

                double score = TeamPickScoring.pickScore(team, c, powerTeam);

                // slight bias towards higher motivation still (tie-breaker)
                score += 0.0001 * c.motivation();

                if (score > bestScore) {
                    bestScore = score;
                    best = c;
                }
            }

            // If no one in window fits (e.g. window exhausted), expand to all remaining
            if (best == null) {
                for (BucketedCandidate c : sortedCandidates) {
                    if (used.contains(c.participantId())) continue;
                    double score = TeamPickScoring.pickScore(team, c, powerTeam);
                    score += 0.0001 * c.motivation();
                    if (score > bestScore) {
                        bestScore = score;
                        best = c;
                    }
                }
            }

            if (best == null) break;

            team.add(best);
            used.add(best.participantId());
        }
    }

    private BucketedCandidate firstNotUsed(List<BucketedCandidate> sorted, Set<Long> used) {
        for (BucketedCandidate c : sorted) {
            if (!used.contains(c.participantId())) return c;
        }
        return null;
    }

    private List<Candidate> loadCandidates(Hackathon hackathon, OptionLabelIndex optionIndex) {
        List<Candidate> out = new ArrayList<>();

        for (Participant participant : hackathon.getParticipants()) {
            QuestionnaireAnswer answer = questionnaireAnswerRepository
                    .findByQuestionnaireAndParticipant(hackathon.getQuestionnaire(), participant)
                    .orElse(null);

            if (answer == null) continue;

            if (!answer.isConsent() && hackathon.getQuestionnaire().getSource() == QuestionnaireSource.INTERNAL) {
                log.info("Skipping participant {}: consent=false", participant.getId());
                continue;
            }

            if (!Eligibility.isAllowed(answer.getData())) {
                log.info("Skipping participant {}: eligibility check failed", participant.getId());
                continue;
            }

            out.add(Candidate.fromAnswer(answer, optionIndex));
        }

        return out;
    }

    private void deleteExistingTeams(Long hackathonId) {
        List<Team> existing = teamRepository.findByHackathonId(hackathonId);
        if (!existing.isEmpty()) teamRepository.deleteAll(existing);
    }

    private void persistTeams2(Hackathon hackathon, UUID generationId, List<TeamDraft2> drafts) {
        for (TeamDraft2 draft : drafts) {
            Team team = new Team();
            team.setHackathon(hackathon);
            team.setName(draft.name());
            team.setGenerationId(generationId);

            // Optional: keep existing score approach, but now teams are created differently.
            // Score still measures cohesion/variety; it doesn't drive the "power team" priority.
            team.setScore(TeamCompatibilityScoring.teamCompatibilityScore(
                    draft.members().stream().map(BucketedCandidate::base).toList()
            ));

            if (team.getMembers() == null) team.setMembers(new ArrayList<>());

            for (BucketedCandidate bc : draft.members()) {
                Candidate c = bc.base();

                TeamMember m = new TeamMember();
                m.setTeam(team);
                m.setGenerationId(generationId);
                m.setParticipantId(c.participantId());

                // store labels for UI
                m.setRoleSnapshot(c.roleLabel());
                m.setMotivationSnapshot(c.motivation());
                m.setYearsExperienceSnapshot(c.yearsExperience());
                m.setSkillsSnapshot(String.join(", ", c.skillLabels()));

                team.getMembers().add(m);
            }

            teamRepository.save(team);
        }
    }

    // =========================================================
    // Teams read + edits (unchanged from your current file)
    // =========================================================

    @Transactional(readOnly = true)
    public List<TeamDTO> getTeams(Long hackathonId) {
        validateHackathonId(hackathonId);

        List<Team> teams = teamRepository.findByHackathonIdOrderByNameAsc(hackathonId);

        Set<Long> participantIds = teams.stream()
                .flatMap(t -> safeMembers(t).stream())
                .map(TeamMember::getParticipantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, ParticipantDto> participantsById = participantRepository.findAllById(participantIds).stream()
                .collect(Collectors.toMap(Participant::getId, ParticipantDto::new));

        return teams.stream()
                .map(t -> toTeamDTO(t, participantsById))
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
        return toTeamDTO(teamRepository.save(team));
    }

    @Transactional
    public TeamDTO addMembers(UUID teamId, AddMembersRequest request) {
        if (teamId == null) throw new BadRequestException("Team id is required");
        if (request == null) throw new BadRequestException("Request body is required");

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        UUID generationId = team.getGenerationId();
        if (generationId == null) throw new ConflictException("Team has no generationId");

        List<Long> ids = request.participantIds();
        if (ids == null || ids.isEmpty()) return toTeamDTO(team);

        if (team.getMembers() == null) team.setMembers(new ArrayList<>());

        for (Long participantId : ids) {
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

        List<TeamMember> members = team.getMembers();
        if (members == null || members.isEmpty()) {
            throw new NotFoundException("Participant " + participantId + " is not in team " + teamId);
        }

        TeamMember memberToRemove = members.stream()
                .filter(m -> Objects.equals(m.getParticipantId(), participantId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Participant " + participantId + " is not in team " + teamId));

        members.remove(memberToRemove);
        teamRepository.save(team);
        return toTeamDTO(team);
    }

    @Transactional
    public void moveMember(MoveMemberRequest request) {
        if (request == null) throw new BadRequestException("Request body is required");

        UUID fromTeamId = request.fromTeamId();
        UUID toTeamId = request.toTeamId();
        Long participantId = request.participantId();

        if (fromTeamId == null || toTeamId == null) throw new BadRequestException("fromTeamId and toTeamId are required");
        if (participantId == null || participantId <= 0) throw new BadRequestException("Invalid participant id");
        if (fromTeamId.equals(toTeamId)) return;

        Team toTeam = teamRepository.findById(toTeamId)
                .orElseThrow(() -> new NotFoundException("Target team not found: " + toTeamId));

        UUID generationId = toTeam.getGenerationId();
        if (generationId == null) throw new ConflictException("Target team has no generationId");

        TeamMember membership = teamMemberRepository
                .findByGenerationIdAndParticipantId(generationId, participantId)
                .orElseThrow(() -> new NotFoundException("Participant " + participantId + " is not in any team for generation " + generationId));

        Team fromTeam = membership.getTeam();
        if (fromTeam == null || !fromTeam.getId().equals(fromTeamId)) {
            throw new BadRequestException("Participant " + participantId + " is not in team " + fromTeamId);
        }

        membership.setTeam(toTeam);
        teamMemberRepository.save(membership);

        recalcScoreForTeam(fromTeamId);
        recalcScoreForTeam(toTeamId);
    }

    private TeamDTO toTeamDTO(Team team) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(team.getId());

        Set<Long> participantIds = members.stream()
                .map(TeamMember::getParticipantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, ParticipantDto> participantsById = participantRepository.findAllById(participantIds).stream()
                .collect(Collectors.toMap(Participant::getId, ParticipantDto::new));

        List<TeamMemberDTO> memberDtos = members.stream()
                .map(m -> {
                    ParticipantDto dto = participantsById.get(m.getParticipantId());
                    if (dto == null) throw new NotFoundException("Participant not found: " + m.getParticipantId());
                    return new TeamMemberDTO(m, dto);
                })
                .toList();

        return new TeamDTO(team, memberDtos);
    }

    private TeamDTO toTeamDTO(Team team, Map<Long, ParticipantDto> participantsById) {
        List<TeamMemberDTO> memberDtos = safeMembers(team).stream()
                .map(m -> {
                    ParticipantDto dto = participantsById.get(m.getParticipantId());
                    if (dto == null) throw new NotFoundException("Participant not found: " + m.getParticipantId());
                    return new TeamMemberDTO(m, dto);
                })
                .toList();

        return new TeamDTO(team, memberDtos);
    }

    private static List<TeamMember> safeMembers(Team team) {
        return team.getMembers() == null ? List.of() : team.getMembers();
    }

    // =========================================================
    // Score recalculation for edits (unchanged)
    // =========================================================

    private void recalcScoreForTeam(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);

        List<Candidate> candidates = members.stream()
                .map(TeamService::candidateFromSnapshots)
                .toList();

        team.setScore(TeamCompatibilityScoring.teamCompatibilityScore(candidates));
        teamRepository.save(team);
    }

    private static Candidate candidateFromSnapshots(TeamMember m) {
        Candidate c = new Candidate();
        c.setParticipantId(m.getParticipantId());
        c.setRoleLabel(TextUtil.safe(m.getRoleSnapshot()));
        c.setSkillLabels(SkillUtil.parseCommaSeparated(m.getSkillsSnapshot()));
        c.setMotivation(m.getMotivationSnapshot() == null ? 0 : m.getMotivationSnapshot());
        c.setYearsExperience(m.getYearsExperienceSnapshot() == null ? 0 : m.getYearsExperienceSnapshot());
        return c;
    }

    // =========================================================
    // Validation
    // =========================================================

    private static void validateHackathonId(Long hackathonId) {
        if (hackathonId == null || hackathonId <= 0) throw new BadRequestException("Invalid hackathon id");
    }

    private static int normalizeTeamSize(Integer requested) {
        if (requested == null || requested < 1) return 1;
        return requested;
    }

    // =========================================================
    // Option lookup built from Questionnaire.questions JsonNode
    // =========================================================

    private static final class OptionLabelIndex {
        private final Map<String, String> optionIdToLabel;

        private OptionLabelIndex(Map<String, String> optionIdToLabel) {
            this.optionIdToLabel = optionIdToLabel;
        }

        static OptionLabelIndex from(JsonNode questionnaireQuestionsJson) {
            Map<String, String> map = new HashMap<>();
            if (questionnaireQuestionsJson == null || questionnaireQuestionsJson.isNull()) {
                return new OptionLabelIndex(map);
            }

            JsonNode questionsArr = questionnaireQuestionsJson.path("questions");
            if (!questionsArr.isArray()) return new OptionLabelIndex(map);

            for (JsonNode q : questionsArr) {
                JsonNode options = q.path("options");
                if (!options.isArray()) continue;

                for (JsonNode opt : options) {
                    String id = opt.path("id").asText("").trim();
                    String label = opt.path("label").asText("").trim();
                    if (!id.isBlank() && !label.isBlank()) {
                        map.put(id, label);
                    }
                }
            }

            return new OptionLabelIndex(map);
        }

        String labelOrFallback(String optionId) {
            if (optionId == null) return "";
            String trimmed = optionId.trim();
            if (trimmed.isBlank()) return "";
            return optionIdToLabel.getOrDefault(trimmed, trimmed);
        }

        Set<String> labelsOrFallbacks(Collection<String> optionIds) {
            if (optionIds == null || optionIds.isEmpty()) return Set.of();
            LinkedHashSet<String> out = new LinkedHashSet<>();
            for (String id : optionIds) {
                String label = labelOrFallback(id);
                if (!label.isBlank()) out.add(label);
            }
            return out;
        }
    }

    // =========================================================
    // Candidate parsing (same as your current file)
    // =========================================================

    private static final class Candidate {
        private Long participantId;

        private String roleLabel;
        private Set<String> skillLabels = Set.of();

        private int motivation;
        private int yearsExperience;

        public Long participantId() { return participantId; }
        public String roleLabel() { return roleLabel; }
        public Set<String> skillLabels() { return skillLabels; }
        public int motivation() { return motivation; }
        public int yearsExperience() { return yearsExperience; }

        public void setParticipantId(Long participantId) { this.participantId = participantId; }
        public void setRoleLabel(String roleLabel) { this.roleLabel = roleLabel; }
        public void setSkillLabels(Set<String> skillLabels) { this.skillLabels = (skillLabels == null ? Set.of() : skillLabels); }
        public void setMotivation(int motivation) { this.motivation = motivation; }
        public void setYearsExperience(int yearsExperience) { this.yearsExperience = yearsExperience; }

        static Candidate fromAnswer(QuestionnaireAnswer questionnaireAnswer, OptionLabelIndex optionIndex) {
            JsonNode data = questionnaireAnswer.getData();

            Candidate c = new Candidate();
            c.setParticipantId(questionnaireAnswer.getParticipant().getId());

            if (data == null || data.isNull()) return c;

            if (data.isArray()) {
                Map<String, JsonNode> byKey = new HashMap<>();
                for (JsonNode item : data) {
                    String key = item.path("key").asText("").trim();
                    if (!key.isBlank()) byKey.put(key, item);
                }

                String roleOptionId = AnswerUtil.firstOptionId(byKey.get("role"));
                c.setRoleLabel(optionIndex.labelOrFallback(roleOptionId));

                List<String> skillOptionIds = AnswerUtil.optionIds(byKey.get("skills"));
                c.setSkillLabels(optionIndex.labelsOrFallbacks(skillOptionIds));

                int motivation = AnswerUtil.motivationAverage(byKey.get("motivation"));
                c.setMotivation(Math.max(0, motivation));

                int years = AnswerUtil.numberLike(byKey.get("years_experience"));
                c.setYearsExperience(Math.max(0, years));

                return c;
            }

            c.setRoleLabel(TextUtil.safe(data.path("role").asText(null)));

            JsonNode skillsNode = data.path("skills");
            if (skillsNode.isArray()) {
                LinkedHashSet<String> skills = new LinkedHashSet<>();
                for (JsonNode s : skillsNode) {
                    String val = s.asText("").trim();
                    if (!val.isBlank()) skills.add(val);
                }
                c.setSkillLabels(skills);
            } else {
                c.setSkillLabels(SkillUtil.parseCommaSeparated(skillsNode.asText("")));
            }

            c.setMotivation(Math.max(0, data.path("motivation").asInt(0)));
            c.setYearsExperience(Math.max(0, data.path("years_experience").asInt(0)));

            return c;
        }
    }

    private static final class AnswerUtil {
        private AnswerUtil() {}

        static String firstOptionId(JsonNode answerNode) {
            if (answerNode == null || answerNode.isNull()) return null;

            JsonNode arr = answerNode.path("valueOptionIds");
            if (arr.isArray()) {
                for (JsonNode it : arr) {
                    String id = it.asText("").trim();
                    if (!id.isBlank()) return id;
                }
            }

            String single = answerNode.path("valueOptionId").asText("").trim();
            if (!single.isBlank()) return single;

            String txt = answerNode.path("valueText").asText("").trim();
            return txt.isBlank() ? null : txt;
        }

        static List<String> optionIds(JsonNode answerNode) {
            if (answerNode == null || answerNode.isNull()) return List.of();

            JsonNode arr = answerNode.path("valueOptionIds");
            if (arr.isArray()) {
                List<String> out = new ArrayList<>();
                for (JsonNode it : arr) {
                    String id = it.asText("").trim();
                    if (!id.isBlank()) out.add(id);
                }
                if (!out.isEmpty()) return out;
            }

            String single = answerNode.path("valueOptionId").asText("").trim();
            if (!single.isBlank()) return List.of(single);

            String txt = answerNode.path("valueText").asText("").trim();
            if (txt.isBlank()) return List.of();
            return Arrays.stream(txt.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList();
        }

        static int numberLike(JsonNode answerNode) {
            if (answerNode == null || answerNode.isNull()) return 0;

            JsonNode n = answerNode.get("valueNumber");
            if (n != null && n.isNumber()) return n.asInt(0);

            String txt = answerNode.path("valueText").asText(null);
            if (txt == null) return 0;

            try { return Integer.parseInt(txt.trim()); }
            catch (Exception ignored) { return 0; }
        }

        static int motivationAverage(JsonNode answerNode) {
            if (answerNode == null || answerNode.isNull()) return 0;

            JsonNode obj = answerNode.path("valueJson");
            if (obj != null && obj.isObject()) {
                int count = 0;
                double sum = 0.0;

                Iterator<Map.Entry<String, JsonNode>> it = obj.fields();
                while (it.hasNext()) {
                    JsonNode v = it.next().getValue();
                    if (v == null) continue;

                    if (v.isNumber()) {
                        sum += v.asDouble();
                        count++;
                    } else if (v.isTextual()) {
                        try {
                            sum += Double.parseDouble(v.asText().trim());
                            count++;
                        } catch (Exception ignored) {}
                    }
                }

                if (count > 0) return (int) Math.round(sum / (double) count);
            }

            JsonNode n = answerNode.get("valueNumber");
            if (n != null && n.isNumber()) return n.asInt(0);

            String txt = answerNode.path("valueText").asText(null);
            if (txt != null) {
                try { return Integer.parseInt(txt.trim()); }
                catch (Exception ignored) {}
            }
            return 0;
        }
    }

    private static final class Eligibility {
        private Eligibility() {}

        static boolean isAllowed(JsonNode data) {
            if (data == null || data.isNull()) return false;

            if (data.isArray()) {
                for (JsonNode item : data) {
                    if (!"age_verification".equals(item.path("key").asText(""))) continue;

                    JsonNode b = item.get("valueBoolean");
                    if (b != null && b.isBoolean()) return b.asBoolean();

                    String txt = item.path("valueText").asText("").trim().toLowerCase(Locale.ROOT);
                    return txt.startsWith("yes") || txt.equals("true");
                }
                return true;
            }

            if (data.has("age_verification")) {
                String txt = data.path("age_verification").asText("").trim().toLowerCase(Locale.ROOT);
                return txt.startsWith("yes") || txt.equals("true");
            }

            return true;
        }
    }

    private static final class TextUtil {
        private TextUtil() {}
        static String safe(String text) {
            if (text == null) return "";
            String t = text.trim();
            return t.isBlank() ? "" : t;
        }
    }

    private static final class SkillUtil {
        private SkillUtil() {}
        static Set<String> parseCommaSeparated(String raw) {
            if (raw == null) return Set.of();
            String t = raw.trim();
            if (t.isBlank()) return Set.of();
            return Arrays.stream(t.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }
    }

    // =========================================================
    // Layout (unchanged)
    // =========================================================

    private static final class TeamLayout {
        private final int numberOfTeams;
        private final List<Integer> maxSizesPerTeam;

        private TeamLayout(int numberOfTeams, List<Integer> maxSizesPerTeam) {
            this.numberOfTeams = numberOfTeams;
            this.maxSizesPerTeam = maxSizesPerTeam;
        }

        int numberOfTeams() { return numberOfTeams; }
        List<Integer> maxSizesPerTeam() { return maxSizesPerTeam; }

        static TeamLayout compute(int totalCandidates, int targetTeamSize) {
            int teams = (int) Math.ceil((double) totalCandidates / (double) targetTeamSize);
            teams = Math.max(1, teams);

            int base = totalCandidates / teams;
            int extra = totalCandidates % teams;

            List<Integer> maxSizes = new ArrayList<>(teams);
            for (int i = 0; i < teams; i++) {
                maxSizes.add(base + (i < extra ? 1 : 0));
            }

            return new TeamLayout(teams, maxSizes);
        }
    }

    // =========================================================
    // NEW: power-team pick scoring + bucketing
    // =========================================================

    private static final class TeamDraft2 {
        private final String name;
        private final int capacity;
        private final List<BucketedCandidate> members = new ArrayList<>();
        private final Set<String> roleBuckets = new HashSet<>();
        private final Set<String> skillBuckets = new HashSet<>();

        TeamDraft2(String name, int capacity) {
            this.name = name;
            this.capacity = capacity;
        }

        String name() { return name; }
        List<BucketedCandidate> members() { return members; }

        boolean isFull() { return members.size() >= capacity; }

        void add(BucketedCandidate c) {
            members.add(c);
            if (!c.roleBucket().isBlank()) roleBuckets.add(c.roleBucket());
            skillBuckets.addAll(c.skillBuckets());
        }

        Set<String> roleBuckets() { return roleBuckets; }
        Set<String> skillBuckets() { return skillBuckets; }
    }

    private static final class BucketedCandidate {
        private final Candidate base;
        private final String roleBucket;
        private final Set<String> skillBuckets;

        private BucketedCandidate(Candidate base, String roleBucket, Set<String> skillBuckets) {
            this.base = base;
            this.roleBucket = roleBucket == null ? "" : roleBucket;
            this.skillBuckets = skillBuckets == null ? Set.of() : skillBuckets;
        }

        static BucketedCandidate from(Candidate c, RoleSkillBucketer bucketer) {
            String roleBucket = bucketer.roleBucket(c.roleLabel());
            Set<String> skillBuckets = bucketer.skillBuckets(c.skillLabels());
            return new BucketedCandidate(c, roleBucket, skillBuckets);
        }

        Candidate base() { return base; }

        Long participantId() { return base.participantId(); }
        int motivation() { return base.motivation(); }
        int yearsExperience() { return base.yearsExperience(); }

        String roleBucket() { return roleBucket; }
        Set<String> skillBuckets() { return skillBuckets; }
    }

    private static final class TeamPickScoring {
        // Motivation dominates. Variety is still meaningful.
        // Power team leans even harder toward motivation.
        static double pickScore(TeamDraft2 team, BucketedCandidate c, boolean powerTeam) {
            if (powerTeam && c.motivation() < 3) return Double.NEGATIVE_INFINITY;

            double motivationW = powerTeam ? 4.2 : 2.8;
            double newRoleW = 1.2;
            double newSkillW = 0.10;
            double duplicateRolePenalty = 0.6;

            double score = 0.0;

            // Motivation normalized to 0..1 based on 1..5 (your current scale)
            score += motivationW * normalizeMotivation01(c.motivation());

            // New role bonus
            boolean newRole = !c.roleBucket().isBlank() && !team.roleBuckets().contains(c.roleBucket());
            if (newRole) score += newRoleW;

            // Skill bucket bonuses (count only new skill buckets)
            int newSkillCount = 0;
            for (String sb : c.skillBuckets()) {
                if (!team.skillBuckets().contains(sb)) newSkillCount++;
            }
            score += newSkillW * newSkillCount;

            // If role already exists, apply penalty to avoid stacking same role too much
            if (!c.roleBucket().isBlank() && team.roleBuckets().contains(c.roleBucket())) {
                score -= duplicateRolePenalty;
            }

            // Small experience nudge (optional): helps power team avoid all-newcomers or all-vets
            score += 0.08 * normalizeYears01(c.yearsExperience());

            return score;
        }

        private static double normalizeMotivation01(int motivation) {
            int clamped = Math.max(1, Math.min(5, motivation));
            return (clamped - 1) / 4.0;
        }

        private static double normalizeYears01(int years) {
            int clamped = Math.max(0, years);
            double capped = Math.min(20.0, clamped);
            return capped / 20.0;
        }
    }

    /**
     * Learns “stable buckets” from a mixed dataset:
     * - map messy imported roles/skills into:
     *   - known canonical buckets via keyword mapping
     *   - otherwise top-N most frequent normalized values
     *   - else OTHER
     */
    private static final class RoleSkillBucketer {
        private final Set<String> topRoleTokens;
        private final Set<String> topSkillTokens;

        private RoleSkillBucketer(Set<String> topRoleTokens, Set<String> topSkillTokens) {
            this.topRoleTokens = topRoleTokens;
            this.topSkillTokens = topSkillTokens;
        }

        static RoleSkillBucketer build(List<Candidate> candidates) {
            Map<String, Integer> roleFreq = new HashMap<>();
            Map<String, Integer> skillFreq = new HashMap<>();

            for (Candidate c : candidates) {
                String roleTok = normalizeToken(c.roleLabel());
                if (!roleTok.isBlank()) roleFreq.merge(roleTok, 1, Integer::sum);

                for (String s : c.skillLabels()) {
                    String tok = normalizeToken(s);
                    if (!tok.isBlank()) skillFreq.merge(tok, 1, Integer::sum);
                }
            }

            // pick top roles/skills by frequency (kept small on purpose)
            Set<String> topRoles = topK(roleFreq, 8);
            Set<String> topSkills = topK(skillFreq, 24);

            return new RoleSkillBucketer(topRoles, topSkills);
        }

        String roleBucket(String roleLabel) {
            String tok = normalizeToken(roleLabel);
            if (tok.isBlank()) return "OTHER_ROLE";

            // First: keyword canonicalization (helps imported chaos)
            String canonical = canonicalRole(tok);
            if (canonical != null) return canonical;

            // Then: frequent buckets
            if (topRoleTokens.contains(tok)) return "ROLE_" + tok;

            return "OTHER_ROLE";
        }

        Set<String> skillBuckets(Set<String> skills) {
            if (skills == null || skills.isEmpty()) return Set.of("OTHER_SKILL");

            LinkedHashSet<String> out = new LinkedHashSet<>();
            for (String s : skills) {
                String tok = normalizeToken(s);
                if (tok.isBlank()) continue;

                String canonical = canonicalSkill(tok);
                if (canonical != null) {
                    out.add(canonical);
                    continue;
                }

                if (topSkillTokens.contains(tok)) out.add("SKILL_" + tok);
                else out.add("OTHER_SKILL");
            }
            return out.isEmpty() ? Set.of("OTHER_SKILL") : out;
        }

        // ---- canonicalizers ----

        private static String canonicalRole(String tok) {
            // very lightweight but effective
            if (containsAny(tok, "dev", "developer", "software", "engineer", "backend", "frontend", "program")) return "ROLE_DEVELOPER";
            if (containsAny(tok, "design", "ui", "ux", "product designer", "graphic")) return "ROLE_DESIGNER";
            if (containsAny(tok, "market", "growth", "sales", "branding", "pr")) return "ROLE_MARKETER";
            if (containsAny(tok, "business", "entrepreneur", "strategy", "management", "founder")) return "ROLE_BUSINESS";
            return null;
        }

        private static String canonicalSkill(String tok) {
            // examples only: keep small, the learned-top list covers most
            if (containsAny(tok, "react", "vue", "angular", "frontend")) return "SKILL_FRONTEND";
            if (containsAny(tok, "java", "spring", "node", "backend", "api")) return "SKILL_BACKEND";
            if (containsAny(tok, "figma", "ux", "ui", "design")) return "SKILL_UIUX";
            if (containsAny(tok, "ml", "ai", "data", "analytics")) return "SKILL_DATA";
            if (containsAny(tok, "devops", "cloud", "docker", "kubernetes", "aws", "gcp", "azure")) return "SKILL_DEVOPS";
            return null;
        }

        private static boolean containsAny(String tok, String... needles) {
            for (String n : needles) {
                if (tok.contains(n)) return true;
            }
            return false;
        }

        private static String normalizeToken(String raw) {
            if (raw == null) return "";
            String t = raw.trim().toLowerCase(Locale.ROOT);
            if (t.isBlank()) return "";
            // remove most punctuation to reduce “DevOps / cloud” vs “devops cloud”
            t = t.replaceAll("[^a-z0-9]+", " ").trim();
            t = t.replaceAll("\\s+", " ");
            return t;
        }

        private static Set<String> topK(Map<String, Integer> freq, int k) {
            if (freq.isEmpty()) return Set.of();
            return freq.entrySet().stream()
                    .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                    .limit(k)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }
    }

    // =========================================================
    // Existing compatibility scoring (kept)
    // =========================================================

    private static final class TeamCompatibilityScoring {

        private static final double W_MOTIVATION = 0.55;
        private static final double W_EXPERIENCE = 0.20;
        private static final double W_ROLE_VARIETY = 0.15;
        private static final double W_SKILL_VARIETY = 0.10;

        static double teamCompatibilityScore(List<Candidate> members) {
            if (members == null || members.isEmpty()) return 0.0;

            double motivation = motivationScore(members);
            double experience = experienceScore(members);
            double roleVariety = roleVarietyScore(members);
            double skillVariety = skillVarietyScore(members);

            double weighted =
                    W_MOTIVATION * motivation +
                            W_EXPERIENCE * experience +
                            W_ROLE_VARIETY * roleVariety +
                            W_SKILL_VARIETY * skillVariety;

            return round2(clamp01(weighted) * 5.0);
        }

        private static double motivationScore(List<Candidate> members) {
            List<Double> vals = members.stream().map(c -> normalizeMotivation(c.motivation())).toList();
            double avg = vals.stream().mapToDouble(v -> v).average().orElse(0.0);
            double cohesion = cohesion(vals, 0.25);
            return clamp01(0.7 * avg + 0.3 * cohesion);
        }

        private static double experienceScore(List<Candidate> members) {
            List<Double> vals = members.stream().map(c -> normalizeYears(c.yearsExperience())).toList();
            double avg = vals.stream().mapToDouble(v -> v).average().orElse(0.0);
            double cohesion = cohesion(vals, 0.35);
            return clamp01(0.6 * avg + 0.4 * cohesion);
        }

        private static double roleVarietyScore(List<Candidate> members) {
            int n = members.size();
            Set<String> roles = members.stream()
                    .map(c -> c.roleLabel() == null ? "" : c.roleLabel().trim().toLowerCase(Locale.ROOT))
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.toSet());
            if (roles.isEmpty()) return 0.4;
            return clamp01(roles.size() / (double) n);
        }

        private static double skillVarietyScore(List<Candidate> members) {
            int n = members.size();
            Set<String> skills = new HashSet<>();
            for (Candidate c : members) {
                for (String s : c.skillLabels()) {
                    String t = s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
                    if (!t.isBlank()) skills.add(t);
                }
            }
            if (skills.isEmpty()) return 0.3;
            double target = 3.0 * n;
            return clamp01(skills.size() / target);
        }

        private static double cohesion(List<Double> values, double sdThreshold) {
            if (values.isEmpty()) return 0.0;
            double avg = values.stream().mapToDouble(v -> v).average().orElse(0.0);
            double var = values.stream().mapToDouble(v -> (v - avg) * (v - avg)).average().orElse(0.0);
            double sd = Math.sqrt(var);
            return clamp01(1.0 - (sd / sdThreshold));
        }

        private static double normalizeMotivation(int motivation) {
            int clamped = Math.max(1, Math.min(5, motivation));
            return (clamped - 1) / 4.0;
        }

        private static double normalizeYears(int years) {
            int clamped = Math.max(0, years);
            double capped = Math.min(20.0, clamped);
            return capped / 20.0;
        }

        private static double clamp01(double v) { return Math.max(0.0, Math.min(1.0, v)); }
        private static double round2(double v) { return Math.round(v * 100.0) / 100.0; }
    }
}
