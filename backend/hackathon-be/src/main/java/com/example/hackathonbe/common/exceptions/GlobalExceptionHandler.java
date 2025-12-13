package com.example.hackathonbe.common.exceptions;

import com.example.hackathonbe.hackathon.exception.HackathonValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.validation.ConstraintViolationException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Your custom app validation exception
    @ExceptionHandler(HackathonValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleHackathonValidation(HackathonValidationException ex) {
        return Map.of(
                "error", "VALIDATION_ERROR",
                "message", ex.getMessage()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {

        List<Map<String, Object>> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fe -> Map.<String, Object>of(
                        "field", fe.getField(),
                        "message", fe.getDefaultMessage(),
                        "rejectedValue", fe.getRejectedValue(),
                        "code", fe.getCode()
                ))
                .toList();

        return Map.of(
                "error", "VALIDATION_ERROR",
                "message", "Validation failed",
                "fieldErrors", fieldErrors
        );
    }

    // OPTIONAL: handles @Valid on @RequestParam, @PathVariable, etc.
    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleConstraintViolation(ConstraintViolationException ex) {

        List<Map<String, Object>> violations = ex.getConstraintViolations()
                .stream()
                .map(v -> Map.<String, Object>of(
                        "field", v.getPropertyPath().toString(),
                        "message", v.getMessage(),
                        "invalidValue", v.getInvalidValue()
                ))
                .toList();

        return Map.of(
                "error", "VALIDATION_ERROR",
                "message", "Validation failed",
                "fieldErrors", violations
        );
    }
}
