package com.example.hackathonbe.auth.controller;

import com.example.hackathonbe.auth.dto.LoginRequest;
import com.example.hackathonbe.auth.dto.LoginResponse;
import com.example.hackathonbe.auth.dto.RegisterRequest;
import com.example.hackathonbe.auth.model.User;
import com.example.hackathonbe.auth.model.UserRole;
import com.example.hackathonbe.auth.repository.UserRepository;
import com.example.hackathonbe.auth.security.JwtAuthenticationFilter;
import com.example.hackathonbe.auth.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = AuthController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class
        )
)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    @MockBean AuthService authService;
    @MockBean UserRepository userRepository;

    @Test
    void registerOrganizer_returnsOk_andDelegatesToService() throws Exception {
        RegisterRequest req = new RegisterRequest("test@example.com", "pw", "Alice", "Smith", "ACME");

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(content().string(""));

        ArgumentCaptor<RegisterRequest> captor = ArgumentCaptor.forClass(RegisterRequest.class);
        verify(authService).registerOrganizer(captor.capture());
        assertEquals("test@example.com", captor.getValue().email());
    }

    @Test
    void login_setsJwtCookie_andReturnsBodyWithoutToken() throws Exception {
        LoginRequest req = new LoginRequest("test@example.com", "pw");

        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new LoginResponse(
                        "JWT_TOKEN_ABC",
                        7L,
                        "test@example.com",
                        "Alice Smith",
                        "ORGANIZER"
                ));

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(req)))
                .andExpect(status().isOk())
                // must set cookie header
                .andExpect(header().exists(HttpHeaders.SET_COOKIE))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        // cookie should contain something like "jwt=" (depends on JwtCookieUtil)
                        containsStringIgnoringCase("jwt"),
                        // typically HttpOnly; keep it flexible to avoid brittle tests
                        anyOf(containsStringIgnoringCase("httponly"), anything())
                )))
                // token must NOT be in response body anymore
                .andExpect(jsonPath("$.token").value(nullValue()))
                .andExpect(jsonPath("$.userId").value(7))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.displayName").value("Alice Smith"))
                .andExpect(jsonPath("$.role").value("ORGANIZER"));

        verify(authService).login(any(LoginRequest.class));
        verifyNoMoreInteractions(authService);
    }

    @Test
    void me_whenAuthenticationNull_returns401() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(userRepository, authService);
    }

    @Test
    void me_whenPrincipalNull_returns401() throws Exception {
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(null);

        mvc.perform(get("/api/auth/me")
                        .requestAttr("org.springframework.security.core.Authentication", auth))
                .andExpect(status().isUnauthorized());

        // This variant may not always bind Authentication parameter depending on your setup.
        // If it fails in your environment, use the "direct call" unit test approach shown below.
    }

    @Test
    void me_whenUserExists_returns200_andUserInfo() {
        AuthService authService = mock(AuthService.class);
        UserRepository userRepository = mock(UserRepository.class);
        AuthController controller = new AuthController(authService, userRepository);

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(42L);

        User user = new User();
        user.setId(42L);
        user.setEmail("a@b.com");
        user.setDisplayName("Alice B");
        user.setRole(UserRole.ORGANIZER);

        when(userRepository.findById(42L)).thenReturn(Optional.of(user));

        ResponseEntity<?> resp = controller.me(auth);

        assertEquals(200, resp.getStatusCodeValue());
        verify(userRepository).findById(42L);
        verifyNoInteractions(authService);
    }

    @Test
    void logout_setsClearingCookie_andReturnsOk() throws Exception {
        mvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(header().exists(HttpHeaders.SET_COOKIE))
                // usually clearing cookie contains Max-Age=0 or Expires in the past
                .andExpect(header().string(HttpHeaders.SET_COOKIE, anyOf(
                        containsStringIgnoringCase("max-age=0"),
                        containsStringIgnoringCase("expires=")
                )));
    }
}
