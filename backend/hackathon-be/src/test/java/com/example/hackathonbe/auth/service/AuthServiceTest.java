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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    @InjectMocks private AuthService authService;

    @Captor private ArgumentCaptor<User> userCaptor;

    private static RegisterRequest reg(String email, String password, String first, String last, String org) {
        return new RegisterRequest(email, password, first, last, org);
    }

    private static LoginRequest loginReq(String email, String password) {
        return new LoginRequest(email, password);
    }

    @BeforeEach
    void setup() {
        // no-op
    }

    // -------------------------
    // registerOrganizer
    // -------------------------

    @Test
    void registerOrganizer_nullRequest_throwsBadRequest() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> authService.registerOrganizer(null));
        assertEquals("Request body is required", ex.getMessage());

        verifyNoInteractions(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void registerOrganizer_blankEmail_throwsBadRequest() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> authService.registerOrganizer(reg("   ", "pw", "A", "B", "Org")));
        assertEquals("Email is required", ex.getMessage());

        verifyNoInteractions(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void registerOrganizer_nullPassword_throwsBadRequest() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> authService.registerOrganizer(reg("a@b.com", null, "A", "B", "Org")));
        assertEquals("Password is required", ex.getMessage());

        verifyNoInteractions(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void registerOrganizer_blankPassword_throwsBadRequest() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> authService.registerOrganizer(reg("a@b.com", "   ", "A", "B", "Org")));
        assertEquals("Password is required", ex.getMessage());

        verifyNoInteractions(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void registerOrganizer_emailAlreadyExists_throwsConflict() {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class,
                () -> authService.registerOrganizer(reg("  TEST@Example.com  ", "pw", "A", "B", "Org")));
        assertEquals("Email already in use", ex.getMessage());

        verify(userRepository).existsByEmail("test@example.com");
        verifyNoMoreInteractions(userRepository);
        verifyNoInteractions(passwordEncoder, jwtService);
    }

    @Test
    void registerOrganizer_validRequest_savesUser_withNormalizedFields_andDisplayNameFromNames() {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret")).thenReturn("HASHED");

        authService.registerOrganizer(reg("  TEST@Example.com ", "secret", "  Alice ", "  Smith  ", "  ACME  "));

        verify(userRepository).existsByEmail("test@example.com");
        verify(passwordEncoder).encode("secret");
        verify(userRepository).save(userCaptor.capture());

        User saved = userCaptor.getValue();
        assertEquals("test@example.com", saved.getEmail());
        assertEquals("HASHED", saved.getPasswordHash());
        assertEquals("Alice", saved.getFirstName());
        assertEquals("Smith", saved.getLastName());
        assertEquals("ACME", saved.getOrganisation());
        assertEquals("Alice Smith", saved.getDisplayName());
        assertEquals(AuthProvider.LOCAL, saved.getAuthProvider());
        assertEquals(UserRole.ORGANIZER, saved.getRole());
        assertTrue(saved.isActive());

        verifyNoInteractions(jwtService);
    }

    @Test
    void registerOrganizer_validRequest_blankNames_usesEmailAsDisplayName_andNullsForBlankOptionalFields() {
        when(userRepository.existsByEmail("x@y.ee")).thenReturn(false);
        when(passwordEncoder.encode("pw")).thenReturn("H");

        authService.registerOrganizer(reg("  x@y.ee ", "pw", "   ", " \n\t ", "   "));

        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();

        assertEquals("x@y.ee", saved.getEmail());
        assertEquals("H", saved.getPasswordHash());
        assertNull(saved.getFirstName());
        assertNull(saved.getLastName());
        assertNull(saved.getOrganisation());
        assertEquals("x@y.ee", saved.getDisplayName());
        assertEquals(UserRole.ORGANIZER, saved.getRole());
        assertEquals(AuthProvider.LOCAL, saved.getAuthProvider());
        assertTrue(saved.isActive());

        verifyNoInteractions(jwtService);
    }

    // -------------------------
    // login
    // -------------------------

    @Test
    void login_nullRequest_throwsBadRequest() {
        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(null));
        assertEquals("Request body is required", ex.getMessage());

        verifyNoInteractions(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void login_blankEmailOrPassword_throwsUnauthorized() {
        UnauthorizedException ex1 = assertThrows(UnauthorizedException.class,
                () -> authService.login(loginReq("   ", "pw")));
        assertEquals("Invalid credentials", ex1.getMessage());

        UnauthorizedException ex2 = assertThrows(UnauthorizedException.class,
                () -> authService.login(loginReq("a@b.com", "   ")));
        assertEquals("Invalid credentials", ex2.getMessage());

        UnauthorizedException ex3 = assertThrows(UnauthorizedException.class,
                () -> authService.login(loginReq("a@b.com", null)));
        assertEquals("Invalid credentials", ex3.getMessage());

        verifyNoInteractions(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void login_userNotFound_throwsUnauthorized() {
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.empty());

        UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                () -> authService.login(loginReq("  A@B.COM ", "pw")));
        assertEquals("Invalid credentials", ex.getMessage());

        verify(userRepository).findByEmail("a@b.com");
        verifyNoMoreInteractions(userRepository);
        verifyNoInteractions(passwordEncoder, jwtService);
    }

    @Test
    void login_userInactive_throwsForbidden() {
        User user = new User();
        user.setActive(false);
        user.setEmail("a@b.com");
        user.setPasswordHash("HASH");
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> authService.login(loginReq("a@b.com", "pw")));
        assertEquals("User is disabled", ex.getMessage());

        verify(userRepository).findByEmail("a@b.com");
        verifyNoInteractions(passwordEncoder, jwtService);
    }

    @Test
    void login_googleOnlyUser_noPasswordHash_throwsBadRequest() {
        User user = new User();
        user.setActive(true);
        user.setEmail("a@b.com");
        user.setPasswordHash(null); // Google-only user
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> authService.login(loginReq("a@b.com", "pw")));
        assertEquals("This account has no password. Use Google login.", ex.getMessage());

        verify(userRepository).findByEmail("a@b.com");
        verifyNoInteractions(passwordEncoder, jwtService);
    }

    @Test
    void login_passwordMismatch_throwsUnauthorized() {
        User user = new User();
        user.setActive(true);
        user.setEmail("a@b.com");
        user.setPasswordHash("HASH");
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pw", "HASH")).thenReturn(false);

        UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                () -> authService.login(loginReq("a@b.com", "pw")));
        assertEquals("Invalid credentials", ex.getMessage());

        verify(userRepository).findByEmail("a@b.com");
        verify(passwordEncoder).matches("pw", "HASH");
        verifyNoInteractions(jwtService);
    }

    @Test
    void login_success_returnsLoginResponse_andGeneratesToken() {
        User user = new User();
        user.setId(42L);
        user.setEmail("a@b.com");
        user.setDisplayName("Alice B");
        user.setRole(UserRole.ORGANIZER);
        user.setActive(true);
        user.setPasswordHash("HASH");

        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pw", "HASH")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("TOKEN123");

        LoginResponse resp = authService.login(loginReq("  A@B.COM  ", "pw"));

        assertNotNull(resp);
        assertEquals("TOKEN123", resp.token());
        assertEquals(42L, resp.userId());
        assertEquals("a@b.com", resp.email());
        assertEquals("Alice B", resp.displayName());
        assertEquals("ORGANIZER", resp.role());

        verify(userRepository).findByEmail("a@b.com");
        verify(passwordEncoder).matches("pw", "HASH");
        verify(jwtService).generateToken(user);
        verifyNoMoreInteractions(jwtService);
    }
}
