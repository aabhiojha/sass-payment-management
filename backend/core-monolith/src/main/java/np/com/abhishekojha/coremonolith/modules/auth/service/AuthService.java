package np.com.abhishekojha.coremonolith.modules.auth.service;

import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.common.enums.UserStatus;
import np.com.abhishekojha.coremonolith.modules.auth.dto.AuthResponse;
import np.com.abhishekojha.coremonolith.modules.auth.dto.LoginRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.RegisterRequest;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserSessionEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserSessionRepository;
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
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest req) {
        if (tenantRepository.existsBySlug(req.tenantSlug())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tenant slug already taken");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        UserEntity user = new UserEntity();
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRole(UserRole.TENANT_ADMIN);
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        return buildSession(user);
    }

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
