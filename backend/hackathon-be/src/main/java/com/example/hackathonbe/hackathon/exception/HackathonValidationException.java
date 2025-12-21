package com.example.hackathonbe.hackathon.exception;

import com.example.hackathonbe.common.exceptions.ApiException;
import org.springframework.http.HttpStatus;

public class HackathonValidationException extends ApiException {
    public HackathonValidationException(String message) {
        super(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }
}
