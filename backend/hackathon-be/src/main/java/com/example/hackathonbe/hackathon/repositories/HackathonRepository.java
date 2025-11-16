package com.example.hackathonbe.hackathon.repositories;

import com.example.hackathonbe.hackathon.model.Hackathon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HackathonRepository extends JpaRepository<Hackathon, Long> {
    Optional<Hackathon> findBySlug(String slug);
}
