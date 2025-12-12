package com.example.hackathonbe.team.service;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.hackathon.repository.QuestionnaireAnswerRepository;
import com.example.hackathonbe.participant.model.Participant;
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

    // Needed by generateTeams logic
    @Mock
    private HackathonRepository hackathonRepository;

    @Mock
    private QuestionnaireAnswerRepository questionnaireAnswerRepository;

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

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));
        when(hackathon.getParticipants()).thenReturn(Set.of()); // no participants

        UUID generationId = teamService.generateTeams(4, hackathonId);

        assertThat(generationId).isNotNull();
        verify(teamRepository, never()).save(any(Team.class));
        verify(teamMemberRepository, never()).save(any(TeamMember.class));
    }

    @Test
    void generateTeams_withCandidates_persistsTeamsAndMembersAndUsesSameGenerationId() {
        Long hackathonId = 1L;
        Hackathon hackathon = mock(Hackathon.class);

        // mock 3 participants
        var p1 = mockParticipant(1L);
        var p2 = mockParticipant(2L);
        var p3 = mockParticipant(3L);

        when(hackathonRepository.findById(hackathonId)).thenReturn(Optional.of(hackathon));
        when(hackathon.getParticipants()).thenReturn(new HashSet<>(List.of(p1, p2, p3)));

        // no existing teams for this hackathon
        when(teamRepository.findByHackathonId(hackathonId)).thenReturn(List.of());

        // questionnaire answers with valid data
        QuestionnaireAnswer a1 = mockAnswer(p1, "Alice", "One", "developer", 5, 2, "java,spring");
        QuestionnaireAnswer a2 = mockAnswer(p2, "Bob", "Two", "designer", 4, 3, "ux,ui");
        QuestionnaireAnswer a3 = mockAnswer(p3, "Cara", "Three", "marketer", 3, 1, "seo,content");

        when(questionnaireAnswerRepository.findByQuestionnaireAndParticipant(any(), eq(p1)))
                .thenReturn(Optional.of(a1));
        when(questionnaireAnswerRepository.findByQuestionnaireAndParticipant(any(), eq(p2)))
                .thenReturn(Optional.of(a2));
        when(questionnaireAnswerRepository.findByQuestionnaireAndParticipant(any(), eq(p3)))
                .thenReturn(Optional.of(a3));

        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UUID resultGenerationId = teamService.generateTeams(3, hackathonId);

        assertThat(resultGenerationId).isNotNull();

        // All saved teams should carry that generationId and all members should as well
        ArgumentCaptor<Team> teamCaptor = ArgumentCaptor.forClass(Team.class);
        verify(teamRepository, atLeastOnce()).save(teamCaptor.capture());

        List<Team> savedTeams = teamCaptor.getAllValues();
        assertThat(savedTeams)
                .isNotEmpty()
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

        // generateTeams now uses cascade; no direct TeamMemberRepository.save() expected here
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
    void getTeams_withGenerationId_usesFilteredRepoAndMapsMembers() {
        UUID generationId = UUID.randomUUID();

        Team t1 = new Team();
        t1.setId(UUID.randomUUID());
        t1.setName("Team 1");
        t1.setGenerationId(generationId);
        t1.setScore(5.0);
        t1.setCreatedAt(OffsetDateTime.now());
        t1.setMembers(new ArrayList<>());

        Team t2 = new Team();
        t2.setId(UUID.randomUUID());
        t2.setName("Team 2");
        t2.setGenerationId(generationId);
        t2.setScore(4.0);
        t2.setCreatedAt(OffsetDateTime.now());
        t2.setMembers(new ArrayList<>());

        when(teamRepository.findByGenerationIdOrderByScoreDesc(generationId))
                .thenReturn(List.of(t1, t2));

        TeamMember m1 = new TeamMember();
        m1.setTeam(t1);
        m1.setParticipantId(1L);
        t1.getMembers().add(m1);

        TeamMember m2 = new TeamMember();
        m2.setTeam(t2);
        m2.setParticipantId(2L);
        t2.getMembers().add(m2);

        TeamMember m3 = new TeamMember();
        m3.setTeam(t1);
        m3.setParticipantId(3L);
        t1.getMembers().add(m3);

        List<TeamDTO> result = teamService.getTeams(1L);

        assertThat(result).hasSize(2);

        TeamDTO dto1 = result.stream()
                .filter(dto -> dto.id().equals(t1.getId()))
                .findFirst()
                .orElseThrow();

        TeamDTO dto2 = result.stream()
                .filter(dto -> dto.id().equals(t2.getId()))
                .findFirst()
                .orElseThrow();

        assertThat(dto1.members()).hasSize(2); // m1, m3
        assertThat(dto2.members()).hasSize(1); // m2

        verify(teamRepository).findByGenerationIdOrderByScoreDesc(generationId);
        verify(teamRepository, never()).findAll();
        verify(teamMemberRepository, never()).findAll();
    }

    @Test
    void getTeams_withoutGenerationId_callsFindAll() {
        Team t1 = new Team();
        t1.setId(UUID.randomUUID());
        t1.setName("Team 1");
        t1.setMembers(new ArrayList<>());

        when(teamRepository.findAll()).thenReturn(List.of(t1));

        List<TeamDTO> result = teamService.getTeams(null);

        assertThat(result).hasSize(1);
        verify(teamRepository).findAll();
        verify(teamRepository, never()).findByGenerationIdOrderByScoreDesc(any());
        verify(teamMemberRepository, never()).findAll();
    }

    // ------------------------------------------------------------------------
    // renameTeam
    // ------------------------------------------------------------------------

    @Test
    void renameTeam_updatesNameAndReturnsUpdatedDTO() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateTeamNameRequest request = new UpdateTeamNameRequest("New team name");

        TeamDTO result = teamService.renameTeam(teamId, request);

        assertThat(result.name()).isEqualTo("New team name");
        verify(teamRepository).save(argThat(t -> t.getName().equals("New team name")));
    }

    @Test
    void renameTeam_blankName_throwsIllegalArgumentException() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        UpdateTeamNameRequest request = new UpdateTeamNameRequest("  ");

        assertThatThrownBy(() -> teamService.renameTeam(teamId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Team name must not be blank");
    }

    // ------------------------------------------------------------------------
    // addMembers
    // ------------------------------------------------------------------------

    @Test
    void addMembers_addsNewMembersAndReturnsUpdatedDTO() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, 100L))
                .thenReturn(false);
        when(teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, 200L))
                .thenReturn(false);
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddMembersRequest request = new AddMembersRequest(List.of(100L, 200L));

        TeamDTO dto = teamService.addMembers(teamId, request);

        assertThat(dto.members()).hasSize(2);
        assertThat(dto.members()).extracting("participantId")
                .containsExactlyInAnyOrder(100L, 200L);

        // New logic saves via Team (cascade)
        verify(teamRepository).save(team);
    }

    @Test
    void addMembers_whenParticipantAlreadyInGeneration_throwsIllegalStateException() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, 100L))
                .thenReturn(true);

        AddMembersRequest request = new AddMembersRequest(List.of(100L));

        assertThatThrownBy(() -> teamService.addMembers(teamId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already in a team");
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

        TeamDTO dto = teamService.removeMember(teamId, participantId);

        assertThat(dto.members()).isEmpty();
        // Depending on your implementation you may rely purely on orphanRemoval or call delete().
        // If you explicitly call delete(existing) in the service, keep this verify:
        // verify(teamMemberRepository).delete(existing);
        verify(teamRepository).save(team);
    }

    @Test
    void removeMember_whenMembershipNotFound_throwsIllegalArgumentException() {
        Long participantId = 999L;

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        assertThatThrownBy(() -> teamService.removeMember(teamId, participantId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("is not in team");
    }

    // ------------------------------------------------------------------------
    // moveMember
    // ------------------------------------------------------------------------

    @Test
    void moveMember_movesExistingMembershipToTargetTeam() {
        Long participantId = 555L;
        UUID otherTeamId = UUID.randomUUID();

        Team targetTeam = new Team();
        targetTeam.setId(otherTeamId);
        targetTeam.setGenerationId(generationId);
        targetTeam.setHackathon(team.getHackathon());
        targetTeam.setMembers(new ArrayList<>());

        TeamMember existing = new TeamMember();
        existing.setId(UUID.randomUUID());
        existing.setTeam(team); // currently in original team
        existing.setGenerationId(generationId);
        existing.setParticipantId(participantId);

        when(teamRepository.findById(otherTeamId)).thenReturn(Optional.of(targetTeam));
        when(teamMemberRepository.findByGenerationIdAndParticipantId(generationId, participantId))
                .thenReturn(Optional.of(existing));

        MoveMemberRequest request = new MoveMemberRequest(teamId, participantId, otherTeamId);

        teamService.moveMember(request);

        verify(teamMemberRepository).save(argThat(tm ->
                tm.getParticipantId().equals(participantId)
                        && tm.getTeam() == targetTeam
                        && tm.getGenerationId().equals(generationId)
        ));
    }

    @Test
    void moveMember_addsNewMembershipWhenNoneExists() {
        UUID fromTeamId = UUID.randomUUID();
        Long participantId = 777L;
        UUID targetTeamId = UUID.randomUUID();

        Team targetTeam = new Team();
        targetTeam.setId(targetTeamId);
        targetTeam.setGenerationId(generationId);
        targetTeam.setHackathon(team.getHackathon());
        targetTeam.setMembers(new ArrayList<>());

        when(teamRepository.findById(targetTeamId)).thenReturn(Optional.of(targetTeam));
        when(teamMemberRepository.findByGenerationIdAndParticipantId(generationId, participantId))
                .thenReturn(Optional.empty());

        MoveMemberRequest request = new MoveMemberRequest(fromTeamId, participantId, targetTeamId);

        teamService.moveMember(request);

        verify(teamMemberRepository).save(argThat(tm ->
                tm.getParticipantId().equals(participantId)
                        && tm.getTeam() == targetTeam
                        && tm.getGenerationId().equals(generationId)
        ));
    }
}
