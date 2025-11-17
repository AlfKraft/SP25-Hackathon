package com.example.hackathonbe.participant.repository;

import com.example.hackathonbe.participant.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    Optional<Participant> findByEmail(String email);
    List<Participant> findAllByEmailIn(Collection<String> email);

}
