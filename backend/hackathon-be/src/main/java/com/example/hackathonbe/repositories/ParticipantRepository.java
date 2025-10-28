package com.example.hackathonbe.repositories;

import com.example.hackathonbe.dto.ParticipantBrief;
import com.example.hackathonbe.upload.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    Optional<Participant> findByEmail(String email);
    List<Participant> findAllByEmailIn(Collection<String> email);

    @Query(value = """
        SELECT
          id AS id,
          data ->> 'first_name' AS firstName,
          data ->> 'last_name' AS lastName,
          data ->> 'email' AS email,
          (data ->> 'motivation')::int AS motivation,
          data ->> 'role' AS role,
          data ->> 'skills' AS skills,
          (data ->> 'years_experience')::int AS yearsExperience
        FROM participants
        """, nativeQuery = true)
    List<ParticipantBrief> fetchForTeaming();
}
