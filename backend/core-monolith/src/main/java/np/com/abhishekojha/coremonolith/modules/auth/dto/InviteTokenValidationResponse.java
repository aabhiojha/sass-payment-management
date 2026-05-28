package np.com.abhishekojha.coremonolith.modules.auth.dto;

import java.time.Instant;

public record InviteTokenValidationResponse(
        String email,
        String role,
        String tenantName,
        Instant expiresAt
) {}
