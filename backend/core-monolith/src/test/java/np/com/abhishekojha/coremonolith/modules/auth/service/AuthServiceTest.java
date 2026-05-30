package np.com.abhishekojha.coremonolith.modules.auth.service;

import np.com.abhishekojha.coremonolith.common.enums.InvitationRole;
import np.com.abhishekojha.coremonolith.common.enums.InvitationStatus;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.common.enums.UserStatus;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.auth.dto.AcceptInviteRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.AuthResponse;
import np.com.abhishekojha.coremonolith.modules.auth.dto.LoginRequest;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserSessionEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserSessionRepository;
import np.com.abhishekojha.coremonolith.modules.invitation.model.UserInvitationEntity;
import np.com.abhishekojha.coremonolith.modules.invitation.repository.InvitationRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserSessionRepository userSessionRepository;
    @Mock private InvitationRepository invitationRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private AuditService auditService;

    @InjectMocks
    private AuthService authService;

    // ── login ────────────────────────────────────────────────────────────────

    @Test
    void login_unknownEmail_throws401() {
        when(userRepository.findByEmailAndDeletedAtIsNull("x@x.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("x@x.com", "pass")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_wrongPassword_throws401() {
        UserEntity user = activeUser();
        when(userRepository.findByEmailAndDeletedAtIsNull(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", user.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest(user.getEmail(), "wrong")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_disabledAccount_throws403() {
        UserEntity user = activeUser();
        user.setStatus(UserStatus.DISABLED);
        when(userRepository.findByEmailAndDeletedAtIsNull(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pass", user.getPasswordHash())).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new LoginRequest(user.getEmail(), "pass")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void login_success_returnsAuthResponse() {
        UserEntity user = activeUser();
        when(userRepository.findByEmailAndDeletedAtIsNull(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pass", user.getPasswordHash())).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn("jwt");

        AuthResponse response = authService.login(new LoginRequest(user.getEmail(), "pass"));

        assertThat(response.accessToken()).isEqualTo("jwt");
        assertThat(response.email()).isEqualTo(user.getEmail());
        assertThat(user.getLastLoginAt()).isNotNull();
    }

    // ── refresh ──────────────────────────────────────────────────────────────

    @Test
    void refresh_sessionNotFound_throws401() {
        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("bad-token"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refresh_sessionExpired_throws401() {
        UserSessionEntity session = activeSession(activeUser());
        session.setExpiresAt(Instant.now().minusSeconds(1));
        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> authService.refresh("token"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refresh_revokedSession_throws401() {
        UserSessionEntity session = activeSession(activeUser());
        session.setRevokedAt(Instant.now().minusSeconds(10));
        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> authService.refresh("token"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refresh_validSession_revokesOldAndReturnsNewTokens() {
        UserEntity user = activeUser();
        UserSessionEntity session = activeSession(user);
        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.of(session));
        when(jwtService.generateAccessToken(user)).thenReturn("new-jwt");

        AuthResponse response = authService.refresh("valid-token");

        assertThat(session.getRevokedAt()).isNotNull();
        assertThat(response.accessToken()).isEqualTo("new-jwt");
    }

    // ── logout ───────────────────────────────────────────────────────────────

    @Test
    void logout_validToken_revokesSession() {
        UserEntity user = activeUser();
        UserSessionEntity session = activeSession(user);
        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.of(session));

        authService.logout("token");

        assertThat(session.getRevokedAt()).isNotNull();
    }

    @Test
    void logout_unknownToken_silentNoOp() {
        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.empty());

        assertThatCode(() -> authService.logout("unknown")).doesNotThrowAnyException();
    }

    // ── acceptInvite ─────────────────────────────────────────────────────────

    @Test
    void acceptInvite_invalidToken_throws400() {
        when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.acceptInvite(new AcceptInviteRequest("bad", "pass123!", null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void acceptInvite_alreadyAccepted_throws400() {
        UserInvitationEntity inv = pendingInvitation();
        inv.setStatus(InvitationStatus.ACCEPTED);
        when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> authService.acceptInvite(new AcceptInviteRequest("tok", "pass123!", null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void acceptInvite_expired_throws400AndMarksInvitationExpired() {
        UserInvitationEntity inv = pendingInvitation();
        inv.setExpiresAt(Instant.now().minusSeconds(1));
        when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> authService.acceptInvite(new AcceptInviteRequest("tok", "pass123!", null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
    }

    @Test
    void acceptInvite_emailAlreadyRegistered_throws409() {
        UserInvitationEntity inv = pendingInvitation();
        when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(inv));
        when(userRepository.existsByEmail(inv.getEmail())).thenReturn(true);

        assertThatThrownBy(() -> authService.acceptInvite(new AcceptInviteRequest("tok", "pass123!", null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void acceptInvite_success_createsUserAndMarksAccepted() {
        UserInvitationEntity inv = pendingInvitation();
        when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(inv));
        when(userRepository.existsByEmail(inv.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(jwtService.generateAccessToken(any())).thenReturn("jwt");

        AuthResponse response = authService.acceptInvite(new AcceptInviteRequest("tok", "pass123!", null));

        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
        assertThat(inv.getAcceptedAt()).isNotNull();
        assertThat(response.email()).isEqualTo(inv.getEmail());
        verify(userRepository).save(any(UserEntity.class));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private UserEntity activeUser() {
        UserEntity u = new UserEntity();
        u.setId(1L);
        u.setEmail("user@example.com");
        u.setPasswordHash("hashed-password");
        u.setRole(UserRole.TENANT_USER);
        u.setStatus(UserStatus.ACTIVE);
        return u;
    }

    private UserSessionEntity activeSession(UserEntity user) {
        UserSessionEntity s = new UserSessionEntity();
        s.setUser(user);
        s.setRefreshTokenHash("some-hash");
        s.setIssuedAt(Instant.now().minusSeconds(60));
        s.setExpiresAt(Instant.now().plusSeconds(3600));
        return s;
    }

    private UserInvitationEntity pendingInvitation() {
        TenantEntity tenant = new TenantEntity();
        tenant.setId(1L);
        tenant.setName("Test Corp");

        UserInvitationEntity inv = new UserInvitationEntity();
        inv.setId(10L);
        inv.setEmail("invited@example.com");
        inv.setRole(InvitationRole.TENANT_USER);
        inv.setTenant(tenant);
        inv.setStatus(InvitationStatus.PENDING);
        inv.setExpiresAt(Instant.now().plusSeconds(86400));
        return inv;
    }
}
