package com.example.hackathonbe.admin.repositories;

import com.example.hackathonbe.admin.model.Hackathon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HackathonRepository extends JpaRepository<Hackathon, Long> {
    Optional<Hackathon> findBySlug(String slug);
}
