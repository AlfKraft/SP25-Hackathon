package com.example.hackathonbe.admin.service;

import com.example.hackathonbe.admin.dto.HackathonCreateRequest;
import com.example.hackathonbe.admin.dto.HackathonUpdateRequest;
import com.example.hackathonbe.admin.exeptions.HackathonValidationException;
import com.example.hackathonbe.admin.model.Hackathon;
import com.example.hackathonbe.admin.model.HackathonStatus;
import com.example.hackathonbe.admin.repositories.HackathonRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class HackathonService {

    private final HackathonRepository hackathonRepository;
    private final ObjectMapper objectMapper; // make sure you have Jackson on classpath

    public Hackathon createHackathon(HackathonCreateRequest request) {
        validateCreateRequest(request);

        Hackathon hackathon = new Hackathon();
        hackathon.setName(request.name());
        hackathon.setSlug(generateSlug(request.name()));
        hackathon.setDescription(request.description());
        hackathon.setLocation(request.location());
        hackathon.setStartDate(request.startDate());
        hackathon.setEndDate(request.endDate());
        hackathon.setStatus(HackathonStatus.DRAFT);
        hackathon.setRequireApproval(request.requireApproval());
        hackathon.setAllowTeamCreation(request.allowTeamCreation());
        hackathon.setBannerUrl(request.bannerUrl());
        hackathon.setQuestionnaire(request.questionnaire());
        hackathon.setCreatedAt(Instant.now());
        hackathon.setUpdatedAt(Instant.now());

        return hackathonRepository.save(hackathon);
    }

    public Hackathon updateHackathon(Long id, HackathonUpdateRequest request) {
        Hackathon hackathon = hackathonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Hackathon not found"));

        validateUpdateRequest(hackathon, request);

        hackathon.setName(request.name());
        hackathon.setDescription(request.description());
        hackathon.setLocation(request.location());
        hackathon.setStartDate(request.startDate());
        hackathon.setEndDate(request.endDate());
        hackathon.setStatus(request.status());
        hackathon.setUpdatedAt(Instant.now());

        return hackathonRepository.save(hackathon);
    }

    private void validateCreateRequest(HackathonCreateRequest request) {
        validateDates(request.startDate(), request.endDate());

        validateQuestionnaireJson(request.questionnaire());
    }

    private void validateUpdateRequest(Hackathon existing, HackathonUpdateRequest request) {
        validateDates(request.startDate(), request.endDate());

        // Business rule: OPEN hackathon must start today or in the future
        if (request.status() == HackathonStatus.OPEN &&
                request.startDate().isBefore(LocalDate.now())) {
            throw new HackathonValidationException(
                    "Hackathon with status OPEN must have a start date today or in the future."
            );
        }

        // Business rule: FINISHED hackathon must end today or in the past
        if (request.status() == HackathonStatus.FINISHED &&
                request.endDate().isAfter(LocalDate.now())) {
            throw new HackathonValidationException(
                    "Hackathon with status FINISHED cannot have an end date in the future."
            );
        }

        // Optional rule example: once FINISHED, you cannot change status back
        if (existing.getStatus() == HackathonStatus.FINISHED &&
                request.status() != HackathonStatus.FINISHED) {
            throw new HackathonValidationException(
                    "Finished hackathons cannot change status."
            );
        }
    }

    public List<Hackathon> listHackathons() {
        return hackathonRepository.findAll();
    }

    public Optional<Hackathon> getById(Long id) {
        return hackathonRepository.findById(id);
    }

    public void deleteById(Long id) {
        if (!hackathonRepository.existsById(id)) {
            throw new EntityNotFoundException("Hackathon not found");
        }
        hackathonRepository.deleteById(id);
    }


    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new HackathonValidationException("Start date cannot be after end date.");
        }
    }

    private void validateQuestionnaireJson(JsonNode questionnaire) {
        // If questionnaire is omitted or null → OK
        if (questionnaire == null || questionnaire.isNull()) {
            return;
        }

        // Must be a JSON object
        if (!questionnaire.isObject()) {
            throw new HackathonValidationException("Questionnaire must be a JSON object.");
        }

        // Must contain "questions" array
        JsonNode questions = questionnaire.get("questions");
        if (questions == null || !questions.isArray()) {
            throw new HackathonValidationException("Questionnaire JSON must contain a 'questions' array.");
        }
    }


    private String generateSlug(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("-+$", "");
    }
}

