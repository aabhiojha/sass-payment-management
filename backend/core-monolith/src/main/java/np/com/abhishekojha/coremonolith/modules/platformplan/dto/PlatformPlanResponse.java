package np.com.abhishekojha.coremonolith.modules.platformplan.dto;

import np.com.abhishekojha.coremonolith.modules.platformplan.model.PlatformPlanEntity;

import java.math.BigDecimal;
import java.time.Instant;

public record PlatformPlanResponse(
        Long id,
        String name,
        String description,
        BigDecimal price,
        String currency,
        String billingCadence,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static PlatformPlanResponse from(PlatformPlanEntity e) {
        return new PlatformPlanResponse(
                e.getId(),
                e.getName(),
                e.getDescription(),
                e.getPrice(),
                e.getCurrency(),
                e.getBillingCadence().name(),
                e.getStatus().name(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
