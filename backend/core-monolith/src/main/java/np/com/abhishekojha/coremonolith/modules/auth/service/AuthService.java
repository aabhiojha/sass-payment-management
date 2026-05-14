package np.com.abhishekojha.coremonolith.modules.auth.service;

import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.InvitationRole;
import np.com.abhishekojha.coremonolith.common.enums.InvitationStatus;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.common.enums.UserStatus;
import np.com.abhishekojha.coremonolith.modules.auth.dto.AcceptInviteRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.AuthResponse;
import np.com.abhishekojha.coremonolith.modules.auth.dto.LoginRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.RegisterRequest;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserSessionEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserSessionRepository;
import np.com.abhishekojha.coremonolith.modules.invitation.model.UserInvitationEntity;
import np.com.abhishekojha.coremonolith.modules.invitation.repository.InvitationRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class AuthService {

    private static final long REFRESH_TOKEN_TTL_SECONDS = 30L * 24 * 3600;

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final UserSessionRepository userSessionRepository;
    private final InvitationRepository invitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse login(LoginRequest req) {
        UserEntity user = userRepository.findByEmailAndDeletedAtIsNull(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        user.setLastLoginAt(Instant.now());

        return buildSession(user);
    }

    public AuthResponse refresh(String rawRefreshToken) {
        String tokenHash = sha256Hex(rawRefreshToken);
        UserSessionEntity session = userSessionRepository.findByRefreshTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (session.getRevokedAt() != null || session.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired or revoked");
        }

        session.setRevokedAt(Instant.now());

        return buildSession(session.getUser());
    }

    public void logout(String rawRefreshToken) {
        String tokenHash = sha256Hex(rawRefreshToken);
        userSessionRepository.findByRefreshTokenHash(tokenHash).ifPresent(session -> {
            session.setRevokedAt(Instant.now());
        });
    }

    public AuthResponse acceptInvite(AcceptInviteRequest req) {
        String tokenHash = sha256Hex(req.token());

        UserInvitationEntity inv = invitationRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN"));

        if (inv.getStatus() != InvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVITATION_NOT_PENDING");
        }
        if (inv.getExpiresAt().isBefore(Instant.now())) {
            inv.setStatus(InvitationStatus.EXPIRED);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVITATION_EXPIRED");
        }
        if (userRepository.existsByEmail(inv.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED");
        }

        UserEntity user = new UserEntity();
        user.setEmail(inv.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRole(toUserRole(inv.getRole()));
        user.setTenant(inv.getTenant());
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(Instant.now());
        userRepository.save(user);

        inv.setStatus(InvitationStatus.ACCEPTED);
        inv.setAcceptedAt(Instant.now());

        return buildSession(user);
    }

    private UserRole toUserRole(InvitationRole role) {
        return switch (role) {
            case TENANT_ADMIN -> UserRole.TENANT_ADMIN;
            case TENANT_USER  -> UserRole.TENANT_USER;
        };
    }

    private AuthResponse buildSession(UserEntity user) {
        String rawRefreshToken = UUID.randomUUID().toString();

        UserSessionEntity session = new UserSessionEntity();
        session.setUser(user);
        session.setRefreshTokenHash(sha256Hex(rawRefreshToken));
        session.setIssuedAt(Instant.now());
        session.setExpiresAt(Instant.now().plusSeconds(REFRESH_TOKEN_TTL_SECONDS));
        userSessionRepository.save(session);

        String accessToken = jwtService.generateAccessToken(user);

        return new AuthResponse(accessToken, rawRefreshToken, user.getId(), user.getEmail(), user.getRole().name());
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
