package np.com.abhishekojha.notificationservice.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.notificationservice.config.EmailProperties;
import np.com.abhishekojha.notificationservice.dto.InviteEmailRequest;
import np.com.abhishekojha.notificationservice.dto.ReminderEmailRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy 'at' HH:mm 'UTC'")
            .withZone(ZoneOffset.UTC);

    private final SendGrid sendGrid;
    private final EmailProperties props;

    public void sendUserInvitation(InviteEmailRequest req) {
        String subject = "You've been invited to join " + req.getTenantName();
        String body = buildUserInvitationHtml(req);
        send(req.getRecipientEmail(), subject, body);
    }

    public void sendAdminInvitation(InviteEmailRequest req) {
        String subject = "You've been invited as Administrator of " + req.getTenantName();
        String body = buildAdminInvitationHtml(req);
        send(req.getRecipientEmail(), subject, body);
    }

    public void sendReminder(ReminderEmailRequest req) {
        String subject = "Payment Reminder – " + req.getProductName() + " due " + req.getDueDate();
        String body = buildReminderHtml(req);
        send(req.getCustomerEmail(), subject, body);
    }

    private void send(String toAddress, String subject, String htmlBody) {
        if (toAddress == null || toAddress.isBlank()) {
            throw new IllegalArgumentException("Recipient email address is required");
        }
        Email from = new Email(props.getFromEmail(), props.getFromName());
        Email to = new Email(toAddress);
        Content content = new Content("text/html", htmlBody);
        Mail mail = new Mail(from, subject, to, content);

        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sendGrid.api(request);
            if (response.getStatusCode() >= 400) {
                log.warn("SendGrid rejected email to {} — status={} body={}", toAddress, response.getStatusCode(), response.getBody());
            } else {
                log.info("Email sent to {} — status={}", toAddress, response.getStatusCode());
            }
        } catch (IOException e) {
            log.error("Failed to send email to {}: {}", toAddress, e.getMessage());
            throw new RuntimeException("Email delivery failed", e);
        }
    }

    private String buildAdminInvitationHtml(InviteEmailRequest req) {
        String expiry = req.getExpiresAt() != null ? DATE_FMT.format(req.getExpiresAt()) : "N/A";
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b;background:#f8fafc;">
                  <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
                    <div style="background:#7c3aed;border-radius:6px;padding:12px 16px;margin:0 0 24px;">
                      <p style="margin:0;color:#fff;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;">Administrator Invitation</p>
                    </div>
                    <h2 style="margin:0 0 8px;color:#7c3aed;font-size:22px;">You've been invited as Administrator</h2>
                    <p style="margin:0 0 20px;color:#475569;">You have been selected to administer <strong>%s</strong>. As an administrator, you will have full control over the workspace settings, users, and billing.</p>
                    <p style="margin:0 0 8px;color:#475569;">Use the token below when accepting your invitation:</p>
                    <div style="background:#f5f3ff;border-radius:6px;padding:16px;margin:0 0 20px;font-family:monospace;font-size:13px;word-break:break-all;color:#0f172a;border:1px solid #ddd6fe;">%s</div>
                    <p style="margin:0 0 24px;font-size:13px;color:#94a3b8;">This invitation expires on <strong>%s</strong>.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;">
                    <p style="margin:0;font-size:12px;color:#cbd5e1;">If you did not expect this invitation, you can safely ignore this email.</p>
                  </div>
                </body>
                </html>
                """.formatted(req.getTenantName(), req.getInviteToken(), expiry);
    }

    private String buildUserInvitationHtml(InviteEmailRequest req) {
        String expiry = req.getExpiresAt() != null ? DATE_FMT.format(req.getExpiresAt()) : "N/A";
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b;background:#f8fafc;">
                  <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
                    <h2 style="margin:0 0 8px;color:#2563eb;font-size:22px;">You've been invited!</h2>
                    <p style="margin:0 0 20px;color:#475569;">You have been invited to join <strong>%s</strong> as <strong>%s</strong>.</p>
                    <p style="margin:0 0 8px;color:#475569;">Use the token below when accepting your invitation:</p>
                    <div style="background:#f1f5f9;border-radius:6px;padding:16px;margin:0 0 20px;font-family:monospace;font-size:13px;word-break:break-all;color:#0f172a;border:1px solid #e2e8f0;">%s</div>
                    <p style="margin:0 0 24px;font-size:13px;color:#94a3b8;">This invitation expires on <strong>%s</strong>.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;">
                    <p style="margin:0;font-size:12px;color:#cbd5e1;">If you did not expect this invitation, you can safely ignore this email.</p>
                  </div>
                </body>
                </html>
                """.formatted(req.getTenantName(), req.getRole() != null ? req.getRole().display() : "user", req.getInviteToken(), expiry);
    }

    private String buildReminderHtml(ReminderEmailRequest req) {
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b;background:#f8fafc;">
                  <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
                    <h2 style="margin:0 0 8px;color:#dc2626;font-size:22px;">Payment Reminder</h2>
                    <p style="margin:0 0 20px;color:#475569;">Dear <strong>%s</strong>,</p>
                    <p style="margin:0 0 16px;color:#475569;">This is a friendly reminder that a payment is due soon.</p>
                    <table style="width:100%%;border-collapse:collapse;margin:0 0 24px;">
                      <tr style="background:#f8fafc;">
                        <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#64748b;width:40%%;">Product</td>
                        <td style="padding:10px 12px;border:1px solid #e2e8f0;">%s</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#64748b;">Amount Due</td>
                        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-weight:bold;color:#0f172a;">%s</td>
                      </tr>
                      <tr style="background:#f8fafc;">
                        <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#64748b;">Due Date</td>
                        <td style="padding:10px 12px;border:1px solid #e2e8f0;">%s</td>
                      </tr>
                    </table>
                    <p style="margin:0 0 24px;color:#475569;">Please ensure timely payment to avoid any service interruption.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;">
                    <p style="margin:0;font-size:12px;color:#cbd5e1;">This is an automated reminder from <strong>%s</strong>.</p>
                  </div>
                </body>
                </html>
                """.formatted(req.getCustomerName(), req.getProductName(), req.getAmount(), req.getDueDate(), req.getTenantName());
    }

}
