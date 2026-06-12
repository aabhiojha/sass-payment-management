package np.com.abhishekojha.coremonolith.modules.audit.dto;

import np.com.abhishekojha.coremonolith.modules.audit.model.AuditLogEntity;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        Long actorId,
        String actorEmail,
        String actorName,
        String tenantName,
        String action,
        String resourceType,
        Long resourceId,
        String target,
        String oldValue,
        String newValue,
        String description,
        String userAgent,
        Instant createdAt
) {
    public static AuditLogResponse from(AuditLogEntity e) {
        return from(e, null);
    }

    public static AuditLogResponse from(AuditLogEntity e, String target) {
        return new AuditLogResponse(
                e.getId(),
                e.getActor().getId(),
                e.getActor().getEmail(),
                e.getActor().getFullName(),
                e.getActor().getTenant() != null ? e.getActor().getTenant().getName() : null,
                e.getAction().getValue(),
                e.getResourceType(),
                e.getResourceId(),
                target,
                e.getOldValue(),
                e.getNewValue(),
                e.getDescription(),
                e.getUserAgent(),
                e.getCreatedAt()
        );
    }
}
