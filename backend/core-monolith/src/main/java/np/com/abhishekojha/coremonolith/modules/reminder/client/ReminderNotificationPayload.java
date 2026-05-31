package np.com.abhishekojha.coremonolith.modules.reminder.client;

public record ReminderNotificationPayload(
        Long tenantId,
        String tenantName,
        String customerName,
        String customerEmail,
        String productName,
        String planName,
        String amount,
        String dueDate,
        int daysBeforeExpiry
) {}
