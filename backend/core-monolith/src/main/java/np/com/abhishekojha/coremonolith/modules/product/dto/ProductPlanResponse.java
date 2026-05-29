package np.com.abhishekojha.coremonolith.modules.product.dto;

import np.com.abhishekojha.coremonolith.modules.product.model.ProductPlanEntity;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductPlanResponse(
        Long id,
        Long tenantId,
        Long productId,
        String name,
        BigDecimal price,
        String currency,
        String billingCadence,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProductPlanResponse from(ProductPlanEntity e) {
        return new ProductPlanResponse(
                e.getId(),
                e.getTenant().getId(),
                e.getProduct().getId(),
                e.getName(),
                e.getPrice(),
                e.getCurrency(),
                e.getBillingCadence().name(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
