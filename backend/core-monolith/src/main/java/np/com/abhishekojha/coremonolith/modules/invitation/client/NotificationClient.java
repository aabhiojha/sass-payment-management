package np.com.abhishekojha.coremonolith.modules.invitation.client;

import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.config.NotificationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
        try {
            restClient.post()
                    .uri("/internal/notify/invitation")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Failed to dispatch invitation email to {}: {}", payload.recipientEmail(), e.getMessage());
        }
    }
}
