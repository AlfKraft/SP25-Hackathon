package com.example.hackathonbe.common.exceptions;

import com.example.hackathonbe.hackathon.exception.HackathonValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(HackathonValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleHackathonValidation(HackathonValidationException ex) {
        return Map.of(
                "error", "VALIDATION_ERROR",
                "message", ex.getMessage()
        );
    }
}