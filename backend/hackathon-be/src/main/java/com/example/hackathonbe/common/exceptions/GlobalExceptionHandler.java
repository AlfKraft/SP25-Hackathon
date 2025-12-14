package com.example.hackathonbe.common.exceptions;

import com.example.hackathonbe.common.exceptions.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 1) Your domain exceptions with built-in HTTP status codes
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(ApiException ex, HttpServletRequest req) {
        ApiError body = new ApiError(
                ex.getCode(),
                ex.getMessage(),
                ex.getStatus().value(),
                req.getRequestURI(),
                OffsetDateTime.now(),
                null
        );
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    // 2) Bean Validation: @Valid body DTOs
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                 HttpServletRequest req) {

        List<ApiError.FieldViolation> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fe -> new ApiError.FieldViolation(
                        fe.getField(),
                        fe.getDefaultMessage(),
                        fe.getRejectedValue()
                ))
                .toList();

        ApiError body = new ApiError(
                "VALIDATION_ERROR",
                "Validation failed",
                HttpStatus.BAD_REQUEST.value(),
                req.getRequestURI(),
                OffsetDateTime.now(),
                fieldErrors
        );

        return ResponseEntity.badRequest().body(body);
    }

    // 3) Bean Validation: @RequestParam / @PathVariable constraints
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex,
                                                              HttpServletRequest req) {

        List<ApiError.FieldViolation> violations = ex.getConstraintViolations()
                .stream()
                .map(v -> new ApiError.FieldViolation(
                        v.getPropertyPath().toString(),
                        v.getMessage(),
                        v.getInvalidValue()
                ))
                .toList();

        ApiError body = new ApiError(
                "VALIDATION_ERROR",
                "Validation failed",
                HttpStatus.BAD_REQUEST.value(),
                req.getRequestURI(),
                OffsetDateTime.now(),
                violations
        );

        return ResponseEntity.badRequest().body(body);
    }

    // 4) Spring Security (when you add/enable it)
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        ApiError body = new ApiError(
                "FORBIDDEN",
                "You don't have permission to perform this action.",
                HttpStatus.FORBIDDEN.value(),
                req.getRequestURI(),
                OffsetDateTime.now(),
                null
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    // 5) Last resort (avoid leaking internal details)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest req) {
        // TODO: log ex with stacktrace + request id
        ApiError body = new ApiError(
                "INTERNAL_ERROR",
                "Unexpected server error",
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                req.getRequestURI(),
                OffsetDateTime.now(),
                null
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
