package np.com.abhishekojha.coremonolith.modules.audit.dto;

import np.com.abhishekojha.coremonolith.modules.audit.model.AuditLogEntity;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        Long actorId,
        String actorEmail,
        String action,
        String resourceType,
        Long resourceId,
        String oldValue,
        String newValue,
        String description,
        String userAgent,
        Instant createdAt
) {
    public static AuditLogResponse from(AuditLogEntity e) {
        return new AuditLogResponse(
                e.getId(),
                e.getActor().getId(),
                e.getActor().getEmail(),
                e.getAction().getValue(),
                e.getResourceType(),
                e.getResourceId(),
                e.getOldValue(),
                e.getNewValue(),
                e.getDescription(),
                e.getUserAgent(),
                e.getCreatedAt()
        );
    }
}
