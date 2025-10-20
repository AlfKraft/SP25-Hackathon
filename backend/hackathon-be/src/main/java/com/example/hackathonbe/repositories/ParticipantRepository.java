package com.example.hackathonbe.repositories;

import com.example.hackathonbe.upload.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    Optional<Participant> findByEmail(String email);
    List<Participant> findAllByEmailIn(Collection<String> email);
}
