package np.com.abhishekojha.coremonolith.modules.tenant.dto;

import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;

import java.time.Instant;

public record TenantResponse(
        Long id,
        String name,
        String slug,
        String companyEmail,
        String timezone,
        String status,
        Instant archivedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static TenantResponse from(TenantEntity t) {
        return new TenantResponse(
                t.getId(),
                t.getName(),
                t.getSlug(),
                t.getCompanyEmail(),
                t.getTimezone(),
                t.getStatus().name(),
                t.getArchivedAt(),
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }
}
