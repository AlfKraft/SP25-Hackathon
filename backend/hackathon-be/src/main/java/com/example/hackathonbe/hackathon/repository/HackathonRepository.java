package com.example.hackathonbe.hackathon.repository;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HackathonRepository extends JpaRepository<Hackathon, Long> {
    Optional<Hackathon> findBySlug(String slug);
    List<Hackathon> findByStatus(HackathonStatus status);

    List<Hackathon> findByOwnerId(Long organizerId);
}
