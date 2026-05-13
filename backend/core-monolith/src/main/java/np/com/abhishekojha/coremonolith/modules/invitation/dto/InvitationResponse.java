package np.com.abhishekojha.coremonolith.modules.invitation.dto;

import np.com.abhishekojha.coremonolith.modules.invitation.model.UserInvitationEntity;

import java.time.Instant;

public record InvitationResponse(
        Long id,
        Long tenantId,
        String email,
        String role,
        String status,
        Instant expiresAt,
        Instant createdAt
) {
    public static InvitationResponse from(UserInvitationEntity inv) {
        return new InvitationResponse(
                inv.getId(),
                inv.getTenant().getId(),
                inv.getEmail(),
                inv.getRole().name(),
                inv.getStatus().name(),
                inv.getExpiresAt(),
                inv.getCreatedAt()
        );
    }
}
