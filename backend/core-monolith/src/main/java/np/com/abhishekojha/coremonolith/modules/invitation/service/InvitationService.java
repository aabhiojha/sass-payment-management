package np.com.abhishekojha.coremonolith.modules.invitation.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.InvitationRole;
import np.com.abhishekojha.coremonolith.common.enums.InvitationStatus;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import np.com.abhishekojha.coremonolith.modules.invitation.client.InviteNotificationPayload;
import np.com.abhishekojha.coremonolith.modules.invitation.client.NotificationClient;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InviteAdminRequest;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InvitationResponse;
import np.com.abhishekojha.coremonolith.modules.invitation.model.UserInvitationEntity;
import np.com.abhishekojha.coremonolith.modules.invitation.repository.InvitationRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;

@Service
@Transactional
@RequiredArgsConstructor
public class InvitationService {

    private static final long INVITE_TTL_DAYS = 7;

    private final InvitationRepository invitationRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final NotificationClient notificationClient;

    public InvitationResponse inviteAdmin(Long tenantId, InviteAdminRequest req) {
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION");
        }

        if (invitationRepository.existsByTenantIdAndEmailAndStatus(tenantId, req.email(), InvitationStatus.PENDING)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVITATION_ALREADY_PENDING");
        }

        String rawToken = generateRawToken();
        Instant now = Instant.now();

        UserInvitationEntity invitation = new UserInvitationEntity();
        invitation.setTenant(tenant);
        invitation.setEmail(req.email());
        invitation.setRole(InvitationRole.TENANT_ADMIN);
        invitation.setInvitedBy(currentUser());
        invitation.setTokenHash(sha256Hex(rawToken));
        invitation.setExpiresAt(now.plus(INVITE_TTL_DAYS, ChronoUnit.DAYS));
        invitation.setCreatedAt(now);

        invitationRepository.save(invitation);

        notificationClient.sendInvitation(new InviteNotificationPayload(
                tenant.getId(), tenant.getName(), req.email(),
                InvitationRole.TENANT_ADMIN.name(), rawToken, invitation.getExpiresAt()
        ));

        return InvitationResponse.from(invitation);
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
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

    private UserEntity currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found"));
    }
}
