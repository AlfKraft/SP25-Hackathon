package com.example.hackathonbe.team.service;

import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.common.exceptions.ConflictException;
import com.example.hackathonbe.common.exceptions.NotFoundException;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.hackathon.repository.QuestionnaireAnswerRepository;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import com.example.hackathonbe.team.dto.TeamDTO;
import com.example.hackathonbe.team.dto.TeamEditRequests.AddMembersRequest;
import com.example.hackathonbe.team.dto.TeamEditRequests.MoveMemberRequest;
import com.example.hackathonbe.team.dto.TeamEditRequests.UpdateTeamNameRequest;
import com.example.hackathonbe.team.model.Team;
import com.example.hackathonbe.team.model.TeamMember;
import com.example.hackathonbe.team.repository.TeamMemberRepository;
import com.example.hackathonbe.team.repository.TeamRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TeamService team-editing operations (rename/add/remove/move).
 */
@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private HackathonRepository hackathonRepository;

    @Mock
    private QuestionnaireAnswerRepository questionnaireAnswerRepository;

    @Mock
    private ParticipantRepository participantRepository;

    @InjectMocks
    private TeamService teamService;

    private UUID teamId;
    private UUID generationId;
    private Team team;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        teamId = UUID.randomUUID();
        generationId = UUID.randomUUID();

        Hackathon hackathon = new Hackathon();
        hackathon.setId(1L);

        team = new Team();
        team.setId(teamId);
        team.setName("Original name");
        team.setGenerationId(generationId);
        team.setHackathon(hackathon);
        team.setCreatedAt(OffsetDateTime.now());
        team.setScore(10.0);
        team.setMembers(new ArrayList<>());
    }

    // ------------------------------------------------------------------------
    // generateTeams
    // ------------------------------------------------------------------------

    @Test
    void generateTeams_whenNoParticipants_returnsRandomGenerationIdAndDoesNotPersist() {
        Long hackathonId = 1L;

        Hackathon hackathon = mock(Hackathon.class);
        Questionnaire questionnaire = mock(Questionnaire.class);

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));
        when(hackathon.getQuestionnaire()).thenReturn(questionnaire);
        when(hackathon.getParticipants()).thenReturn(Set.of()); // no participants

        UUID generated = teamService.generateTeams(4, hackathonId);

        assertThat(generated).isNotNull();
        verify(teamRepository, never()).save(any(Team.class));
        verify(teamMemberRepository, never()).save(any(TeamMember.class));
    }

    @Test
    void generateTeams_withCandidates_persistsTeamsAndMembersAndUsesSameGenerationId() {
        Long hackathonId = 1L;

        Hackathon hackathon = mock(Hackathon.class);
        Questionnaire questionnaire = mock(Questionnaire.class);

        // mock 3 participants
        Participant p1 = mockParticipant(1L);
        Participant p2 = mockParticipant(2L);
        Participant p3 = mockParticipant(3L);

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));
        when(hackathon.getQuestionnaire()).thenReturn(questionnaire);
        when(hackathon.getParticipants()).thenReturn(new HashSet<>(List.of(p1, p2, p3)));

        // no existing teams for this hackathon
        when(teamRepository.findByHackathonId(hackathonId)).thenReturn(List.of());

        // questionnaire answers with valid data (external flat object format)
        QuestionnaireAnswer a1 = mockAnswer(p1, "Alice", "One", "developer", 5, 2, "java,spring");
        QuestionnaireAnswer a2 = mockAnswer(p2, "Bob", "Two", "designer", 4, 3, "ux,ui");
        QuestionnaireAnswer a3 = mockAnswer(p3, "Cara", "Three", "marketer", 3, 1, "seo,content");

        when(questionnaireAnswerRepository.findByQuestionnaireAndParticipant(questionnaire, p1))
                .thenReturn(Optional.of(a1));
        when(questionnaireAnswerRepository.findByQuestionnaireAndParticipant(questionnaire, p2))
                .thenReturn(Optional.of(a2));
        when(questionnaireAnswerRepository.findByQuestionnaireAndParticipant(questionnaire, p3))
                .thenReturn(Optional.of(a3));

        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UUID resultGenerationId = teamService.generateTeams(3, hackathonId);

        assertThat(resultGenerationId).isNotNull();

        ArgumentCaptor<Team> teamCaptor = ArgumentCaptor.forClass(Team.class);
        verify(teamRepository, atLeastOnce()).save(teamCaptor.capture());

        List<Team> savedTeams = teamCaptor.getAllValues();
        assertThat(savedTeams).isNotEmpty();

        // All saved teams should carry that generationId
        assertThat(savedTeams)
                .extracting(Team::getGenerationId)
                .containsOnly(resultGenerationId);

        int totalMembers = savedTeams.stream()
                .map(Team::getMembers)
                .filter(Objects::nonNull)
                .mapToInt(List::size)
                .sum();

        assertThat(totalMembers).isEqualTo(3);

        // Members should have that generationId too
        savedTeams.stream()
                .flatMap(t -> t.getMembers().stream())
                .forEach(m -> assertThat(m.getGenerationId()).isEqualTo(resultGenerationId));

        // New scoring model is 0..5
        savedTeams.forEach(t -> assertThat(t.getScore()).isBetween(0.0, 5.0));

        // generateTeams uses cascade; no direct TeamMemberRepository.save() expected here
        verify(teamMemberRepository, never()).save(any());
    }

    private Participant mockParticipant(Long id) {
        Participant participant = mock(Participant.class);
        when(participant.getId()).thenReturn(id);
        return participant;
    }

    private QuestionnaireAnswer mockAnswer(
            Participant participant,
            String firstName,
            String lastName,
            String role,
            int motivation,
            int yearsExperience,
            String skills
    ) {
        QuestionnaireAnswer answer = mock(QuestionnaireAnswer.class);

        ObjectNode node = objectMapper.createObjectNode();
        node.put("first_name", firstName);
        node.put("last_name", lastName);
        node.put("role", role);
        node.put("motivation", motivation);
        node.put("years_experience", yearsExperience);
        node.put("skills", skills);

        when(answer.getParticipant()).thenReturn(participant);
        when(answer.getData()).thenReturn(node);
        return answer;
    }

    // ------------------------------------------------------------------------
    // getTeams
    // ------------------------------------------------------------------------

    @Test
    void getTeams_usesHackathonFilterAndMapsMembersWithParticipants() {
        Long hackathonId = 1L;

        Team t1 = new Team();
        t1.setId(UUID.randomUUID());
        t1.setName("Team A");
        t1.setGenerationId(generationId);
        t1.setScore(5.0);
        t1.setCreatedAt(OffsetDateTime.now());
        t1.setMembers(new ArrayList<>());

        Team t2 = new Team();
        t2.setId(UUID.randomUUID());
        t2.setName("Team B");
        t2.setGenerationId(generationId);
        t2.setScore(4.0);
        t2.setCreatedAt(OffsetDateTime.now());
        t2.setMembers(new ArrayList<>());

        TeamMember m1 = new TeamMember();
        m1.setTeam(t1);
        m1.setParticipantId(10L);
        t1.getMembers().add(m1);

        TeamMember m2 = new TeamMember();
        m2.setTeam(t2);
        m2.setParticipantId(20L);
        t2.getMembers().add(m2);

        when(teamRepository.findByHackathonIdOrderByNameAsc(hackathonId))
                .thenReturn(List.of(t1, t2));

        Participant p10 = new Participant();
        p10.setId(10L);
        p10.setFirstName("Alice");
        p10.setLastName("Dev");

        Participant p20 = new Participant();
        p20.setId(20L);
        p20.setFirstName("Bob");
        p20.setLastName("Ops");

        when(participantRepository.findAllById(Set.of(10L, 20L)))
                .thenReturn(List.of(p10, p20));

        List<TeamDTO> result = teamService.getTeams(hackathonId);

        assertThat(result).hasSize(2);

        TeamDTO dto1 = result.stream()
                .filter(dto -> dto.id().equals(t1.getId()))
                .findFirst()
                .orElseThrow();

        assertThat(dto1.members()).hasSize(1);
        assertThat(dto1.members().get(0).participant().id()).isEqualTo(10L);
        assertThat(dto1.members().get(0).participant().firstName()).isEqualTo("Alice");

        verify(teamRepository).findByHackathonIdOrderByNameAsc(hackathonId);
        verify(participantRepository).findAllById(Set.of(10L, 20L));
    }

    // ------------------------------------------------------------------------
    // renameTeam
    // ------------------------------------------------------------------------

    @Test
    void renameTeam_updatesNameAndReturnsUpdatedDTO() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // prevent DTO mapping from trying to load members from DB
        when(teamMemberRepository.findByTeamId(teamId)).thenReturn(List.of());

        UpdateTeamNameRequest request = new UpdateTeamNameRequest("New team name");

        TeamDTO result = teamService.renameTeam(teamId, request);

        assertThat(result.name()).isEqualTo("New team name");
        verify(teamRepository).save(argThat(t -> t.getName().equals("New team name")));
    }

    @Test
    void renameTeam_blankName_throwsBadRequestException() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        UpdateTeamNameRequest request = new UpdateTeamNameRequest("  ");

        assertThatThrownBy(() -> teamService.renameTeam(teamId, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Team name must not be blank");
    }

    // ------------------------------------------------------------------------
    // addMembers
    // ------------------------------------------------------------------------

    @Test
    void addMembers_whenParticipantAlreadyInGeneration_throwsConflictException() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        // service checks participant exists BEFORE generation conflict
        when(participantRepository.existsById(100L)).thenReturn(true);

        when(teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, 100L))
                .thenReturn(true);

        AddMembersRequest request = new AddMembersRequest(List.of(100L));

        assertThatThrownBy(() -> teamService.addMembers(teamId, request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already in a team for this generation");
    }

    // ------------------------------------------------------------------------
    // removeMember
    // ------------------------------------------------------------------------

    @Test
    void removeMember_deletesMembershipAndReturnsUpdatedDTO() {
        Long participantId = 123L;

        TeamMember existing = new TeamMember();
        existing.setId(UUID.randomUUID());
        existing.setTeam(team);
        existing.setGenerationId(generationId);
        existing.setParticipantId(participantId);

        team.getMembers().add(existing);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // make DTO mapping consistent with "after removal"
        when(teamMemberRepository.findByTeamId(teamId)).thenReturn(List.of());

        TeamDTO dto = teamService.removeMember(teamId, participantId);

        assertThat(dto.members()).isEmpty();
        verify(teamRepository).save(team);
    }

    @Test
    void removeMember_whenMembershipNotFound_throwsNotFoundException() {
        Long participantId = 999L;

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        assertThatThrownBy(() -> teamService.removeMember(teamId, participantId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("is not in team");
    }

    // ------------------------------------------------------------------------
    // moveMember
    // ------------------------------------------------------------------------

    @Test
    void moveMember_movesExistingMembershipToTargetTeam() {
        Long participantId = 777L;

        UUID fromTeamId = team.getId();
        UUID targetTeamId = UUID.randomUUID();

        Team targetTeam = new Team();
        targetTeam.setId(targetTeamId);
        targetTeam.setGenerationId(generationId);
        targetTeam.setHackathon(team.getHackathon());
        targetTeam.setMembers(new ArrayList<>());

        TeamMember existing = new TeamMember();
        existing.setId(UUID.randomUUID());
        existing.setTeam(team);
        existing.setGenerationId(generationId);
        existing.setParticipantId(participantId);

        team.setMembers(new ArrayList<>());
        team.getMembers().add(existing);

        when(teamRepository.findById(targetTeamId)).thenReturn(Optional.of(targetTeam));
        when(teamMemberRepository.findByGenerationIdAndParticipantId(generationId, participantId))
                .thenReturn(Optional.of(existing));

        // recalcScoreForTeam(...) calls these in many implementations
        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamId(team.getId())).thenReturn(List.of(existing));
        when(teamMemberRepository.findByTeamId(targetTeamId)).thenReturn(List.of(existing));

        MoveMemberRequest request = new MoveMemberRequest(fromTeamId, participantId, targetTeamId);

        teamService.moveMember(request);

        verify(teamMemberRepository).save(argThat(tm ->
                tm.getParticipantId().equals(participantId)
                        && tm.getTeam() == targetTeam
                        && tm.getGenerationId().equals(generationId)
        ));
    }
}
