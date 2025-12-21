package com.example.hackathonbe.auth.service;

import com.example.hackathonbe.auth.dto.LoginRequest;
import com.example.hackathonbe.auth.dto.LoginResponse;
import com.example.hackathonbe.auth.dto.RegisterRequest;
import com.example.hackathonbe.auth.model.AuthProvider;
import com.example.hackathonbe.auth.model.User;
import com.example.hackathonbe.auth.model.UserRole;
import com.example.hackathonbe.auth.repository.UserRepository;
import com.example.hackathonbe.auth.security.JwtService;
import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.common.exceptions.ConflictException;
import com.example.hackathonbe.common.exceptions.ForbiddenException;
import com.example.hackathonbe.common.exceptions.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public void registerOrganizer(RegisterRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required");
        }
        String email = safeLower(request.email());
        if (email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        if (request.password() == null || request.password().isBlank()) {
            throw new BadRequestException("Password is required");
        }

        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Email already in use");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(trimOrNull(request.firstName()));
        user.setLastName(trimOrNull(request.lastName()));
        user.setOrganisation(trimOrNull(request.organisation()));
        user.setDisplayName(buildDisplayName(request.firstName(), request.lastName(), email));
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setRole(UserRole.ORGANIZER);
        user.setActive(true);

        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required");
        }

        String email = safeLower(request.email());
        String password = request.password() == null ? "" : request.password();

        if (email.isBlank() || password.isBlank()) {
            throw new UnauthorizedException("Invalid credentials");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (!user.isActive()) {
            throw new ForbiddenException("User is disabled");
        }

        // Google-only users have no passwordHash
        if (user.getPasswordHash() == null) {
            throw new BadRequestException("This account has no password. Use Google login.");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        String token = jwtService.generateToken(user);

        return new LoginResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole().name()
        );
    }

    private static String safeLower(String s) {
        return s == null ? "" : s.trim().toLowerCase();
    }

    private static String trimOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isBlank() ? null : t;
    }

    private static String buildDisplayName(String firstName, String lastName, String fallbackEmail) {
        String fn = firstName == null ? "" : firstName.trim();
        String ln = lastName == null ? "" : lastName.trim();
        String full = (fn + " " + ln).trim();
        return full.isBlank() ? fallbackEmail : full;
    }
}
