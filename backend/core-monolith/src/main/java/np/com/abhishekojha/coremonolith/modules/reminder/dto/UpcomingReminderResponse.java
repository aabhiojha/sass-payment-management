package np.com.abhishekojha.coremonolith.modules.reminder.dto;

import java.time.Instant;

public record UpcomingReminderResponse(
        Long customerProductId,
        Long customerId,
        String customerName,
        Long productId,
        String productName,
        String planName,
        String amount,
        Instant endsAt,
        Integer daysBeforeExpiry,
        Instant reminderDate
) {
}
