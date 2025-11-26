package com.example.hackathonbe.participant.controller;

import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.participant.dto.ParticipantInfoResponse;
import com.example.hackathonbe.participant.dto.ParticipantUpdateRequest;
import com.example.hackathonbe.participant.service.ParticipantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/{hackathonId}/participants")
@RequiredArgsConstructor
public class ParticipantController {

    private final ParticipantService participantService;

    @GetMapping(value = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<ParticipantDto> getAllParticipants(@PathVariable Long hackathonId) {
        return participantService.getAllParticipants(hackathonId);
    }

    // --- UC-15: load single participant for detail view ---

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ParticipantInfoResponse getParticipantById(@PathVariable Long id, @PathVariable Long hackathonId) {
        return participantService.getParticipantById(id, hackathonId);
    }

    // --- UC-15: edit participant record ---

    @PutMapping(value = "/{participantId}", consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ParticipantInfoResponse updateParticipant(
            @PathVariable Long hackathonId,
            @PathVariable Long participantId,
            @Valid @RequestBody ParticipantUpdateRequest request
    ) {
        return participantService.updateParticipant(hackathonId, participantId, request);
    }

    @DeleteMapping("/{participantId}")
    public void deleteParticipant(@PathVariable Long hackathonId, @PathVariable Long participantId) {
        participantService.deleteParticipant(participantId, hackathonId);
    }

    // --- A1: validation error → field-level messages ---

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.put(error.getField(), error.getDefaultMessage()));

        Map<String, Object> response = new HashMap<>();
        response.put("code", "VALIDATION_ERROR");
        response.put("fieldErrors", fieldErrors);
        return response;
    }

    // --- A2: concurrency conflict → EDIT_CONFLICT ---

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, Object>> handleOptimisticLock(OptimisticLockingFailureException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", "EDIT_CONFLICT");
        body.put("message", "Record was updated by someone else. Please reload the latest version.");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }
}
