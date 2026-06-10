package np.com.abhishekojha.notificationservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "frontend")
@Getter
@Setter
public class FrontendProperties {
    private String baseUrl;
    private String acceptInvitePath = "/accept-invite";
    private String resetPasswordPath = "/reset-password";
}
