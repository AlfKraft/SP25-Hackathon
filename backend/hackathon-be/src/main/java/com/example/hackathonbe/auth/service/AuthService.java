package com.example.hackathonbe.auth.service;

import com.example.hackathonbe.auth.dto.LoginRequest;
import com.example.hackathonbe.auth.dto.LoginResponse;
import com.example.hackathonbe.auth.dto.RegisterRequest;
import com.example.hackathonbe.auth.model.AuthProvider;
import com.example.hackathonbe.auth.model.User;
import com.example.hackathonbe.auth.model.UserRole;
import com.example.hackathonbe.auth.repository.UserRepository;
//import com.example.hackathonbe.auth.security.GoogleTokenVerifier;
import com.example.hackathonbe.auth.security.JwtService;
//import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    //private final GoogleTokenVerifier googleTokenVerifier;

    public void registerOrganizer(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already in use");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setOrganisation(request.organisation());
        user.setDisplayName(request.firstName() + " " + request.lastName());
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setRole(UserRole.ORGANIZER);
        user.setActive(true);

        userRepository.save(user);
    }


    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!user.isActive()) {
            throw new IllegalStateException("User is disabled");
        }

        // If user was created via Google and has no password, fail cleanly
        if (user.getPasswordHash() == null) {
            throw new IllegalArgumentException("This account has no password. Use Google login.");
        }

        boolean passwordMatches = passwordEncoder.matches(request.password(), user.getPasswordHash());
        if (!passwordMatches) {
            throw new IllegalArgumentException("Invalid credentials");
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
/*
    public LoginResponse loginWithGoogle(String idToken) {
        GoogleIdToken.Payload payload = googleTokenVerifier.verify(idToken);

        String email = payload.getEmail();
        String nameFromGoogle = (String) payload.get("name");
        String displayName = (nameFromGoogle != null && !nameFromGoogle.isBlank())
                ? nameFromGoogle
                : email;

        // If a LOCAL user already exists with this email, reuse that user
        // If no user exists, create a new GOOGLE user
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setDisplayName(displayName);
                    newUser.setRole(UserRole.ORGANIZER);
                    newUser.setAuthProvider(AuthProvider.GOOGLE);
                    newUser.setActive(true);
                    // passwordHash stays null for Google-only user
                    return userRepository.save(newUser);
                });

        String token = jwtService.generateToken(user);

        return new LoginResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole().name()
        );
    }

 */
}

