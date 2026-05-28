package np.com.abhishekojha.coremonolith.modules.invitation.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.InvitationRole;
import np.com.abhishekojha.coremonolith.common.enums.InvitationStatus;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.invitation.client.InviteNotificationPayload;
import np.com.abhishekojha.coremonolith.modules.invitation.client.NotificationClient;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InviteRequest;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InvitationResponse;
import np.com.abhishekojha.coremonolith.modules.invitation.model.UserInvitationEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import np.com.abhishekojha.coremonolith.modules.invitation.repository.InvitationRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
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
@Slf4j
public class InvitationService {

    private static final long INVITE_TTL_DAYS = 7;

    private final InvitationRepository invitationRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final NotificationClient notificationClient;
    private final TenantAccessGuard guard;
    private final AuditService auditService;

    public InvitationResponse inviteAdmin(Long tenantId, InviteRequest req) {
        TenantEntity tenant = activeTenant(tenantId);
        guardCanInvite(tenantId, req.email());
        return saveAndDispatch(tenant, req.email(), InvitationRole.TENANT_ADMIN);
    }

    public InvitationResponse inviteUser(Long tenantId, InviteRequest req) {
        guard.requireTenantAccess(tenantId);
        TenantEntity tenant = activeTenant(tenantId);
        guardCanInvite(tenantId, req.email());
        return saveAndDispatch(tenant, req.email(), InvitationRole.TENANT_USER);
    }

    public Page<InvitationResponse> listInvitations(Long tenantId, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        return invitationRepository.findAllByTenantId(tenantId, pageable)
                .map(InvitationResponse::from);
    }

    public void revokeInvitation(Long tenantId, Long invitationId) {
        guard.requireTenantAccess(tenantId);
        UserInvitationEntity inv = findInvitation(tenantId, invitationId);
        requirePending(inv);
        inv.setStatus(InvitationStatus.REVOKED);
        auditService.log(AuditAction.STATUS_CHANGE, "INVITATION", invitationId,
                Map.of("status", "PENDING"), Map.of("status", "REVOKED"));
        log.info("Invitation revoked invitationId={} tenantId={}", invitationId, tenantId);
    }

    public InvitationResponse resendInvitation(Long tenantId, Long invitationId) {
        guard.requireTenantAccess(tenantId);
        UserInvitationEntity inv = findInvitation(tenantId, invitationId);
        requirePending(inv);

        String rawToken = generateRawToken();
        inv.setTokenHash(sha256Hex(rawToken));
        inv.setExpiresAt(Instant.now().plus(INVITE_TTL_DAYS, ChronoUnit.DAYS));

        notificationClient.sendInvitation(new InviteNotificationPayload(
                inv.getTenant().getId(), inv.getTenant().getName(), inv.getEmail(),
                inv.getRole().name(), rawToken, inv.getExpiresAt()
        ));
        log.info("Invitation resent invitationId={} tenantId={}", invitationId, tenantId);
        return InvitationResponse.from(inv);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private InvitationResponse saveAndDispatch(TenantEntity tenant, String email, InvitationRole role) {
        String rawToken = generateRawToken();
        System.out.println(rawToken);
        Instant now = Instant.now();

        UserInvitationEntity invitation = new UserInvitationEntity();
        invitation.setTenant(tenant);
        invitation.setEmail(email);
        invitation.setRole(role);
        invitation.setInvitedBy(guard.currentUser());
        invitation.setTokenHash(sha256Hex(rawToken));
        invitation.setExpiresAt(now.plus(INVITE_TTL_DAYS, ChronoUnit.DAYS));
        invitation.setCreatedAt(now);
        invitationRepository.save(invitation);
        auditService.log(AuditAction.CREATE, "INVITATION", invitation.getId(),
                null, Map.of("email", email, "role", role.name(), "tenantId", tenant.getId()));
        log.info("Invitation created invitationId={} role={} tenantId={}", invitation.getId(), role, tenant.getId());

        InviteNotificationPayload payload = new InviteNotificationPayload(
                tenant.getId(), tenant.getName(), email, role.name(), rawToken, invitation.getExpiresAt()
        );
        if (role == InvitationRole.TENANT_ADMIN) {
            notificationClient.sendAdminInvitation(payload);
        } else {
            notificationClient.sendInvitation(payload);
        }
        return InvitationResponse.from(invitation);
    }

    private TenantEntity activeTenant(Long tenantId) {
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));
        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION");
        }
        return tenant;
    }

    private void guardCanInvite(Long tenantId, String email) {
        if (userRepository.existsByEmailAndDeletedAtIsNull(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "USER_ALREADY_EXISTS");
        }
        if (invitationRepository.existsByTenantIdAndEmailAndStatus(tenantId, email, InvitationStatus.PENDING)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVITATION_ALREADY_PENDING");
        }
    }

    private UserInvitationEntity findInvitation(Long tenantId, Long invitationId) {
        return invitationRepository.findByIdAndTenantId(invitationId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Invitation not found"));
    }

    private void requirePending(UserInvitationEntity inv) {
        if (inv.getStatus() != InvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVITATION_NOT_PENDING");
        }
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
}
