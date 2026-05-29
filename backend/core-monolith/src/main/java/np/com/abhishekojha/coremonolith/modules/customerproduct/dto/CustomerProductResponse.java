package np.com.abhishekojha.coremonolith.modules.customerproduct.dto;

import np.com.abhishekojha.coremonolith.modules.customerproduct.model.CustomerProductEntity;

import java.math.BigDecimal;
import java.time.Instant;

public record CustomerProductResponse(
        Long id,
        Long tenantId,
        Long customerId,
        String customerName,
        Long productId,
        String productName,
        String status,
        Instant startsAt,
        Instant endsAt,
        String notes,
        Long productPlanId,
        String productPlanName,
        BigDecimal amount,
        String currency,
        Instant createdAt,
        Instant updatedAt
) {
    public static CustomerProductResponse from(CustomerProductEntity cp) {
        // Price resolution: custom_price → plan price → product default price
        BigDecimal amount;
        String currency;
        if (cp.getCustomPrice() != null) {
            amount = cp.getCustomPrice();
            currency = cp.getProduct().getCurrency();
        } else if (cp.getProductPlan() != null) {
            amount = cp.getProductPlan().getPrice();
            currency = cp.getProductPlan().getCurrency();
        } else {
            amount = cp.getProduct().getPrice();
            currency = cp.getProduct().getCurrency();
        }

        return new CustomerProductResponse(
                cp.getId(),
                cp.getTenant().getId(),
                cp.getCustomer().getId(),
                cp.getCustomer().getName(),
                cp.getProduct().getId(),
                cp.getProduct().getName(),
                cp.getStatus().name(),
                cp.getStartsAt(),
                cp.getEndsAt(),
                cp.getNotes(),
                cp.getProductPlan() != null ? cp.getProductPlan().getId() : null,
                cp.getProductPlan() != null ? cp.getProductPlan().getName() : null,
                amount,
                currency,
                cp.getCreatedAt(),
                cp.getUpdatedAt()
        );
    }
}
