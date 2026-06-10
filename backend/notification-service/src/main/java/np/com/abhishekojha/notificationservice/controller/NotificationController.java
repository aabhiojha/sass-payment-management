package np.com.abhishekojha.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.notificationservice.dto.InviteEmailRequest;
import np.com.abhishekojha.notificationservice.dto.PasswordResetEmailRequest;
import np.com.abhishekojha.notificationservice.dto.ReminderEmailRequest;
import np.com.abhishekojha.notificationservice.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/notify")
@RequiredArgsConstructor
public class NotificationController {

    private final EmailService emailService;

    @PostMapping("/invitation-user")
    public ResponseEntity<Void> sendUserInvitation(@RequestBody InviteEmailRequest req) {
        emailService.sendUserInvitation(req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/invitation-admin")
    public ResponseEntity<Void> sendAdminInvitation(@RequestBody InviteEmailRequest req) {
        emailService.sendAdminInvitation(req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password-reset")
    public ResponseEntity<Void> sendPasswordReset(@RequestBody PasswordResetEmailRequest req) {
        emailService.sendPasswordReset(req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reminder")
    public ResponseEntity<Void> sendReminder(@RequestBody ReminderEmailRequest req) {
        emailService.sendReminder(req);
        return ResponseEntity.noContent().build();
    }
}
