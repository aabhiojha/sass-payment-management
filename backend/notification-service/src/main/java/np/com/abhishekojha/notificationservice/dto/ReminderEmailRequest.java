package np.com.abhishekojha.notificationservice.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ReminderEmailRequest {
    private Long tenantId;
    private String tenantName;
    private String customerName;
    private String customerEmail;
    private String productName;
    private String planName;
    private String amount;
    private String dueDate;
    private int daysBeforeExpiry;
}
