package np.com.abhishekojha.notificationservice.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
public class PasswordResetEmailRequest {
    private String recipientEmail;
    private String recipientName;
    private String resetToken;
    private Instant expiresAt;
}
