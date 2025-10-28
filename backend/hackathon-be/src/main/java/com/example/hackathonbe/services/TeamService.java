package com.example.hackathonbe.services;

import com.example.hackathonbe.dto.ParticipantBrief;
import com.example.hackathonbe.dto.TeamDTO;
import com.example.hackathonbe.repositories.ParticipantRepository;
import com.example.hackathonbe.repositories.TeamMemberRepository;
import com.example.hackathonbe.repositories.TeamRepository;
import com.example.hackathonbe.teams.model.Team;
import com.example.hackathonbe.teams.model.TeamMember;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepo;
    private final TeamMemberRepository memberRepo;
    private final ParticipantRepository participantRepo;

    @Transactional
    public UUID generateTeams(Integer teamSize) {
        int targetSize = (teamSize == null || teamSize < 3) ? 4 : teamSize;

        // 1) Load candidates
        List<ParticipantBrief> all = participantRepo.fetchForTeaming();
        if (all.isEmpty()) throw new IllegalStateException("No participants to team.");

        // Normalize skills into sets once
        List<Cand> cands = new ArrayList<>(all.stream()
                .map(Cand::from)
                .toList());

        // 2) Seed teams
        cands.sort(Comparator.comparingInt((Cand c) ->
                (c.motivation == null ? 0 : c.motivation) + (c.yearsExp == null ? 0 : c.yearsExp)).reversed());

        int numTeams = Math.max(1, cands.size() / targetSize);
        List<TeamBuild> teams = new ArrayList<>();
        for (int i = 0; i < numTeams && i < cands.size(); i++) {
            var tb = new TeamBuild("Team " + (i+1));
            tb.add(cands.get(i)); // seed
            teams.add(tb);
        }

        // 3) Assign remaining
        Set<Long> assigned = teams.stream().flatMap(t -> t.members.stream()).map(c -> c.id).collect(Collectors.toSet());
        List<Cand> pool = cands.stream().filter(c -> !assigned.contains(c.id)).toList();

        for (Cand cand : pool) {
            TeamBuild bestTeam = null;
            double bestGain = Double.NEGATIVE_INFINITY;
            for (TeamBuild tb : teams) {
                if (tb.members.size() >= targetSize) continue;
                double gain = tb.marginalGain(cand);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestTeam = tb;
                }
            }
            if (bestTeam == null) {
                // All teams full; put into team with max gain and smallest size overflow (optional)
                bestTeam = teams.stream()
                        .max(Comparator.comparingDouble(t -> t.marginalGain(cand)))
                        .orElse(teams.get(0));
            }
            bestTeam.add(cand);
        }

        // 4) Finalize scores
        for (TeamBuild tb : teams) tb.recomputeScore();

        // 5) Persist
        UUID generationId = UUID.randomUUID();
        for (TeamBuild tb : teams) {
            Team t = new Team();
            t.setName(tb.name);
            t.setScore(tb.score);
            t.setGenerationId(generationId);
            teamRepo.save(t);

            for (Cand m : tb.members) {
                TeamMember tm = new TeamMember();
                tm.setTeamId(t.getId());
                tm.setParticipantId(m.id);
                tm.setRoleSnapshot(m.role);
                tm.setSkillsSnapshot(String.join(";", m.skills));
                tm.setMotivationSnapshot(m.motivation);
                tm.setYearsExperienceSnapshot(m.yearsExp);
                memberRepo.save(tm);
            }
        }

        return generationId;
    }

    @Transactional(readOnly = true)
    public List<TeamDTO> getTeams(UUID generationId) {
        List<Team> teams = (generationId == null)
                ? teamRepo.findAll()
                : teamRepo.findByGenerationIdOrderByScoreDesc(generationId);

        Map<UUID, List<TeamMember>> byTeam = memberRepo.findAll()
                .stream().collect(java.util.stream.Collectors.groupingBy(TeamMember::getTeamId));

        return teams.stream().map(t -> new TeamDTO(t, byTeam.getOrDefault(t.getId(), List.of()))).toList();
    }

    // ---- helpers & scoring

    static class Cand {
        Long id;
        String role;
        Set<String> skills;
        Integer motivation;
        Integer yearsExp;
        String firstName;
        String lastName;

        static Cand from(ParticipantBrief p) {
            Set<String> skillSet = new java.util.HashSet<>();
            if (p.getSkills() != null) {
                for (String s : p.getSkills().split("[,;]")) {
                    String k = s.trim().toLowerCase();
                    if (!k.isEmpty()) skillSet.add(k);
                }
            }
            Cand c = new Cand();
            c.id = p.getId();
            c.role = safeLower(p.getRole());
            c.skills = skillSet;
            c.motivation = n(p.getMotivation());
            c.yearsExp = n(p.getYearsExperience());
            c.firstName = p.getFirstName();
            c.lastName = p.getLastName();
            return c;
        }

        static String safeLower(String v){ return v == null ? null : v.trim().toLowerCase(); }
        static Integer n(Integer v){ return v == null ? 0 : v; }
    }

    static class TeamBuild {
        String name;
        List<Cand> members = new ArrayList<>();
        double score = 0.0;

        TeamBuild(String n){ this.name = n; }

        void add(Cand c){ members.add(c); }

        double marginalGain(Cand c) {
            // sum pairwise S with existing + potential bonuses after add – current bonuses
            double pairSum = 0.0;
            for (Cand m : members) pairSum += pairScore(m, c);

            // Bonuses delta
            double beforeBonus = bonus();
            members.add(c);
            double afterBonus = bonus();
            members.remove(members.size()-1);

            return pairSum + (afterBonus - beforeBonus);
        }

        void recomputeScore() {
            double s = 0.0;
            for (int i=0;i<members.size();i++) {
                for (int j=i+1;j<members.size();j++) {
                    s += pairScore(members.get(i), members.get(j));
                }
            }
            s += bonus();
            this.score = s;
        }

        double bonus() {
            // Role coverage
            Set<String> roles = new java.util.HashSet<>();
            Set<String> allSkills = new java.util.HashSet<>();
            for (Cand m : members) {
                if (m.role != null) roles.add(m.role);
                allSkills.addAll(m.skills);
            }
            double b = 0.0;
            if (roles.size() >= 3) b += 0.2;
            if (allSkills.size() >= 8) b += 0.1;
            return b;
        }
    }

    static double pairScore(Cand a, Cand b) {
        double mot = 1.0 - (Math.min(4.0, Math.abs(a.motivation - b.motivation)) / 4.0);
        double skills = jaccard(a.skills, b.skills);
        double roleBonus = (a.role != null && b.role != null && !a.role.equals(b.role)) ? 0.15 : 0.0;
        int range = Math.max(10, Math.abs(a.yearsExp - b.yearsExp)); // avoid div by small
        double exp = 1.0 - (Math.abs(a.yearsExp - b.yearsExp) / (double)range);
        return 0.35*mot + 0.35*skills + 0.15*roleBonus + 0.15*exp;
    }

    static double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() && b.isEmpty()) return 0.0;
        int inter = 0;
        for (String s : a) if (b.contains(s)) inter++;
        int union = a.size() + b.size() - inter;
        return union == 0 ? 0.0 : (double) inter / union;
    }
}
