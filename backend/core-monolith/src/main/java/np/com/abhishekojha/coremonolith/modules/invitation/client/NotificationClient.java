package np.com.abhishekojha.coremonolith.modules.invitation.client;

import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.config.NotificationProperties;
import np.com.abhishekojha.coremonolith.modules.reminder.client.ReminderNotificationPayload;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@Slf4j
public class NotificationClient {

    private final RestClient restClient;

    public NotificationClient(NotificationProperties props) {
        this.restClient = RestClient.builder()
                .baseUrl(props.getBaseUrl())
                .build();
    }

    public void sendInvitation(InviteNotificationPayload payload) {
        dispatch("/internal/notify/invitation-user", payload, payload.recipientEmail());
    }

    public void sendAdminInvitation(InviteNotificationPayload payload) {
        dispatch("/internal/notify/invitation-admin", payload, payload.recipientEmail());
    }

    public void sendPasswordReset(PasswordResetNotificationPayload payload) {
        dispatch("/internal/notify/password-reset", payload, payload.recipientEmail());
    }

    public void sendReminder(ReminderNotificationPayload payload) {
        // Intentionally does NOT swallow — callers must handle failure to record correct status
        restClient.post()
                .uri("/internal/notify/reminder")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();
    }

    private void dispatch(String uri, Object body, String recipientEmail) {
        try {
            restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Failed to dispatch email to {} [{}]: {}", recipientEmail, uri, e.getMessage());
        }
    }
}
