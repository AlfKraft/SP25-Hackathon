package com.example.hackathonbe.auth.controller;

import com.example.hackathonbe.auth.dto.GoogleLoginRequest;
import com.example.hackathonbe.auth.dto.LoginRequest;
import com.example.hackathonbe.auth.dto.LoginResponse;
import com.example.hackathonbe.auth.dto.RegisterRequest;
import com.example.hackathonbe.auth.model.User;
import com.example.hackathonbe.auth.repository.UserRepository;
import com.example.hackathonbe.auth.security.JwtCookieUtil;
import com.example.hackathonbe.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<Void> registerOrganizer(@RequestBody RegisterRequest request) {
        authService.registerOrganizer(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {

        LoginResponse response = authService.login(request);

        ResponseCookie cookie = JwtCookieUtil.createJwtCookie(response.token());

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new LoginResponse(
                        null,                      // do NOT send token in body anymore
                        response.userId(),
                        response.email(),
                        response.displayName(),
                        response.role()
                ));
    }

    // Optional helper: who am I?
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }

        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId)
                .orElseThrow(); // or 404

        return ResponseEntity.ok(new LoginResponse(
                null,
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole().name()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        ResponseCookie clearCookie = JwtCookieUtil.clearJwtCookie();

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .build();
    }
    /*
    @PostMapping("/google")
    public ResponseEntity<LoginResponse> loginWithGoogle(@RequestBody GoogleLoginRequest request) {

        LoginResponse response = authService.loginWithGoogle(request.idToken());

        ResponseCookie cookie = JwtCookieUtil.createJwtCookie(response.token());

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new LoginResponse(
                        null,
                        response.userId(),
                        response.email(),
                        response.displayName(),
                        response.role()
                ));
    }

     */


}
