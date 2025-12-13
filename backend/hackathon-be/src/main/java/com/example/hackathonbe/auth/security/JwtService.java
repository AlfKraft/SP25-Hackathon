package com.example.hackathonbe.auth.security;

import com.example.hackathonbe.auth.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMillis;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expirationMillis:86400000}") long expirationMillis // 1 day
    ) {
        // if secret is plain text, you can skip Decoders.BASE64 and just do getBytes()
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);  // returns SecretKey
        this.expirationMillis = expirationMillis;
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(exp)
                .signWith(key)           // OK with SecretKey in 0.12.x
                .compact();
    }

    public Claims parseToken(String token) {
        Jws<Claims> jws = Jwts.parser()           // 0.12.x style
                .verifyWith(key)                 // expects SecretKey
                .build()
                .parseSignedClaims(token);

        return jws.getPayload();
    }
}
