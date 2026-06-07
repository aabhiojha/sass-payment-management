package np.com.abhishekojha.coremonolith.modules.platformplan.dto;

import np.com.abhishekojha.coremonolith.modules.platformplan.model.TenantPlatformPlanEntity;

import java.math.BigDecimal;
import java.time.Instant;

public record TenantPlatformPlanResponse(
        Long id,
        Long tenantId,
        Long planId,
        String planName,
        BigDecimal effectivePrice,
        String currency,
        String billingCadence,
        String status,
        Instant startDate,
        Instant endDate,
        Instant createdAt
) {
    public static TenantPlatformPlanResponse from(TenantPlatformPlanEntity e) {
        BigDecimal price = e.getCustomPrice() != null
                ? e.getCustomPrice()
                : e.getPlan().getPrice();
        return new TenantPlatformPlanResponse(
                e.getId(),
                e.getTenant().getId(),
                e.getPlan().getId(),
                e.getPlan().getName(),
                price,
                e.getPlan().getCurrency(),
                e.getPlan().getBillingCadence().name(),
                e.getStatus().name(),
                e.getStartDate(),
                e.getEndDate(),
                e.getCreatedAt()
        );
    }
}
