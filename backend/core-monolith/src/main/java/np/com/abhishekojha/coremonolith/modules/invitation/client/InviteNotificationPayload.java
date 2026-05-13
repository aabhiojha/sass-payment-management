package np.com.abhishekojha.coremonolith.modules.invitation.client;

import java.time.Instant;

public record InviteNotificationPayload(
        Long tenantId,
        String tenantName,
        String recipientEmail,
        String role,
        String inviteToken,
        Instant expiresAt
) {}
