package com.example.hackathonbe.auth.security;

import org.springframework.http.ResponseCookie;

public class JwtCookieUtil {

    private static final String COOKIE_NAME = "auth_token";

    private JwtCookieUtil() {
    }

    public static ResponseCookie createJwtCookie(String token) {
        return ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(true)        // set false only for pure http dev if needed
                .sameSite("Lax")     // or "None" if frontend is on a different domain over HTTPS
                .path("/")
                .maxAge(24 * 60 * 60) // 1 day
                .build();
    }

    public static ResponseCookie clearJwtCookie() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(0) // expire immediately
                .build();
    }
}
