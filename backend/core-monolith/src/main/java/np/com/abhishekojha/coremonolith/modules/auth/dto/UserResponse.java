package np.com.abhishekojha.coremonolith.modules.auth.dto;

import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;

import java.time.Instant;

public record UserResponse(
        Long id,
        Long tenantId,
        String email,
        String role,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse from(UserEntity u) {
        return new UserResponse(
                u.getId(),
                u.getTenant() != null ? u.getTenant().getId() : null,
                u.getEmail(),
                u.getRole().name(),
                u.getStatus().name(),
                u.getCreatedAt(),
                u.getUpdatedAt()
        );
    }
}
