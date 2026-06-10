package np.com.abhishekojha.coremonolith.modules.invitation.client;

import java.time.Instant;

public record PasswordResetNotificationPayload(
        String recipientEmail,
        String recipientName,
        String resetToken,
        Instant expiresAt
) {}
