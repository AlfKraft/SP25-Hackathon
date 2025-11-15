package com.example.hackathonbe.admin.exeptions;

public class HackathonValidationException extends RuntimeException {
    public HackathonValidationException(String message) {
        super(message);
    }
}
