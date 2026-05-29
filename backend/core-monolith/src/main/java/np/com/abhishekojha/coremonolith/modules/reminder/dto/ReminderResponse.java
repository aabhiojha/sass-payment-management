package np.com.abhishekojha.coremonolith.modules.reminder.dto;

import np.com.abhishekojha.coremonolith.modules.reminder.model.ReminderEntity;

import java.time.Instant;

public record ReminderResponse(
        Long id,
        Long tenantId,
        Long customerProductId,
        Long customerId,
        String customerName,
        Long productId,
        String productName,
        String status,
        Integer daysBeforeExpiry,
        int retryCount,
        Instant sentAt,
        String errorMessage,
        Instant createdAt
) {
    public static ReminderResponse from(ReminderEntity r) {
        return new ReminderResponse(
                r.getId(),
                r.getTenant().getId(),
                r.getCustomerProduct().getId(),
                r.getCustomerProduct().getCustomer().getId(),
                r.getCustomerProduct().getCustomer().getName(),
                r.getCustomerProduct().getProduct().getId(),
                r.getCustomerProduct().getProduct().getName(),
                r.getStatus().name(),
                r.getDaysBeforeExpiry(),
                r.getRetryCount(),
                r.getSentAt(),
                r.getErrorMessage(),
                r.getCreatedAt()
        );
    }
}
