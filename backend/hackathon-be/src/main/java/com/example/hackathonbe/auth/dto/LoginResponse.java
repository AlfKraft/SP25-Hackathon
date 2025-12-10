package com.example.hackathonbe.auth.dto;

public record LoginResponse(
        String token,
        Long userId,
        String email,
        String displayName,
        String role
) {}
