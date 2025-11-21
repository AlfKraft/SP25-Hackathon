package com.example.hackathonbe.team.service;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.hackathon.repositories.HackathonRepository;
import com.example.hackathonbe.hackathon.repositories.QuestionnaireAnswerRepository;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.team.dto.TeamDTO;
import com.example.hackathonbe.team.dto.TeamEditRequests.AddMembersRequest;
import com.example.hackathonbe.team.dto.TeamEditRequests.MoveMemberRequest;
import com.example.hackathonbe.team.dto.TeamEditRequests.UpdateTeamNameRequest;
import com.example.hackathonbe.team.model.Team;
import com.example.hackathonbe.team.model.TeamMember;
import com.example.hackathonbe.team.repository.TeamMemberRepository;
import com.example.hackathonbe.team.repository.TeamRepository;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import com.fasterxml.jackson.databind.ObjectMapper;

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

    // Needed by existing generateTeams logic; not used directly in these tests
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
    }

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

        // All saved teams should carry that generationId
        ArgumentCaptor<Team> teamCaptor = ArgumentCaptor.forClass(Team.class);
        verify(teamRepository, atLeastOnce()).save(teamCaptor.capture());

        assertThat(teamCaptor.getAllValues())
                .isNotEmpty()
                .extracting(Team::getGenerationId)
                .containsOnly(resultGenerationId);

        // 3 participants -> all should become members
        verify(teamMemberRepository, times(3)).save(any(TeamMember.class));
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

        Team t2 = new Team();
        t2.setId(UUID.randomUUID());
        t2.setName("Team 2");
        t2.setGenerationId(generationId);
        t2.setScore(4.0);
        t2.setCreatedAt(OffsetDateTime.now());

        when(teamRepository.findByGenerationIdOrderByScoreDesc(generationId))
                .thenReturn(List.of(t1, t2));

        TeamMember m1 = new TeamMember();
        m1.setTeamId(t1.getId());
        m1.setParticipantId(1L);

        TeamMember m2 = new TeamMember();
        m2.setTeamId(t2.getId());
        m2.setParticipantId(2L);

        TeamMember m3 = new TeamMember();
        m3.setTeamId(t1.getId());
        m3.setParticipantId(3L);

        when(teamMemberRepository.findAll()).thenReturn(List.of(m1, m2, m3));

        List<TeamDTO> result = teamService.getTeams(generationId);

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
    }

    @Test
    void getTeams_withoutGenerationId_callsFindAll() {
        Team t1 = new Team();
        t1.setId(UUID.randomUUID());
        t1.setName("Team 1");

        when(teamRepository.findAll()).thenReturn(List.of(t1));
        when(teamMemberRepository.findAll()).thenReturn(List.of());

        List<TeamDTO> result = teamService.getTeams(null);

        assertThat(result).hasSize(1);
        verify(teamRepository).findAll();
        verify(teamRepository, never()).findByGenerationIdOrderByScoreDesc(any());
    }

    // ---------- renameTeam ----------

    @Test
    void renameTeam_updatesNameAndReturnsUpdatedDTO() {
        // given
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(teamMemberRepository.findByTeamId(teamId)).thenReturn(List.of());

        UpdateTeamNameRequest request = new UpdateTeamNameRequest("New team name");

        // when
        TeamDTO result = teamService.renameTeam(teamId, request);

        // then
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

    // ---------- addMembers ----------

    @Test
    void addMembers_addsNewMembersAndReturnsUpdatedDTO() {
        // given
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, 100L))
                .thenReturn(false);
        when(teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, 200L))
                .thenReturn(false);

        TeamMember member1 = new TeamMember();
        member1.setId(UUID.randomUUID());
        member1.setTeamId(teamId);
        member1.setGenerationId(generationId);
        member1.setParticipantId(100L);

        TeamMember member2 = new TeamMember();
        member2.setId(UUID.randomUUID());
        member2.setTeamId(teamId);
        member2.setGenerationId(generationId);
        member2.setParticipantId(200L);

        when(teamMemberRepository.findByTeamId(teamId))
                .thenReturn(List.of(member1, member2));

        AddMembersRequest request = new AddMembersRequest(List.of(100L, 200L));

        // when
        TeamDTO dto = teamService.addMembers(teamId, request);

        // then
        assertThat(dto.members()).hasSize(2);
        assertThat(dto.members()).extracting("participantId")
                .containsExactlyInAnyOrder(100L, 200L);

        verify(teamMemberRepository, times(2)).save(any(TeamMember.class));
    }

    @Test
    void addMembers_whenParticipantAlreadyInGeneration_throwsIllegalStateException() {
        // given
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.existsByGenerationIdAndParticipantId(generationId, 100L))
                .thenReturn(true);

        AddMembersRequest request = new AddMembersRequest(List.of(100L));

        // when / then
        assertThatThrownBy(() -> teamService.addMembers(teamId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already in a team");
    }

    // ---------- removeMember ----------

    @Test
    void removeMember_deletesMembershipAndReturnsUpdatedDTO() {
        // given
        Long participantId = 123L;

        TeamMember existing = new TeamMember();
        existing.setId(UUID.randomUUID());
        existing.setTeamId(teamId);
        existing.setGenerationId(generationId);
        existing.setParticipantId(participantId);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamIdAndParticipantId(teamId, participantId))
                .thenReturn(Optional.of(existing));
        when(teamMemberRepository.findByTeamId(teamId)).thenReturn(List.of());

        // when
        TeamDTO dto = teamService.removeMember(teamId, participantId);

        // then
        assertThat(dto.members()).isEmpty();
        verify(teamMemberRepository).delete(existing);
    }

    @Test
    void removeMember_whenMembershipNotFound_throwsIllegalArgumentException() {
        Long participantId = 999L;

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamIdAndParticipantId(teamId, participantId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> teamService.removeMember(teamId, participantId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("is not in team");
    }

    // ---------- moveMember ----------

    @Test
    void moveMember_movesExistingMembershipToTargetTeam() {
        Long participantId = 555L;
        UUID otherTeamId = UUID.randomUUID();

        Team targetTeam = new Team();
        targetTeam.setId(otherTeamId);
        targetTeam.setGenerationId(generationId);
        targetTeam.setHackathon(team.getHackathon());

        TeamMember existing = new TeamMember();
        existing.setId(UUID.randomUUID());
        existing.setTeamId(teamId); // currently in teamId
        existing.setGenerationId(generationId);
        existing.setParticipantId(participantId);

        when(teamRepository.findById(otherTeamId)).thenReturn(Optional.of(targetTeam));
        when(teamMemberRepository.findByGenerationIdAndParticipantId(generationId, participantId))
                .thenReturn(Optional.of(existing));

        MoveMemberRequest request = new MoveMemberRequest(participantId, otherTeamId);

        // when
        teamService.moveMember(request);

        // then
        verify(teamMemberRepository).save(argThat(tm ->
                tm.getParticipantId().equals(participantId)
                        && tm.getTeamId().equals(otherTeamId)
                        && tm.getGenerationId().equals(generationId)
        ));
    }

    @Test
    void moveMember_addsNewMembershipWhenNoneExists() {
        Long participantId = 777L;
        UUID targetTeamId = UUID.randomUUID();

        Team targetTeam = new Team();
        targetTeam.setId(targetTeamId);
        targetTeam.setGenerationId(generationId);
        targetTeam.setHackathon(team.getHackathon());

        when(teamRepository.findById(targetTeamId)).thenReturn(Optional.of(targetTeam));
        when(teamMemberRepository.findByGenerationIdAndParticipantId(generationId, participantId))
                .thenReturn(Optional.empty());

        MoveMemberRequest request = new MoveMemberRequest(participantId, targetTeamId);

        // when
        teamService.moveMember(request);

        // then
        verify(teamMemberRepository).save(argThat(tm ->
                tm.getParticipantId().equals(participantId)
                        && tm.getTeamId().equals(targetTeamId)
                        && tm.getGenerationId().equals(generationId)
        ));
    }
}
