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
import np.com.abhishekojha.notificationservice.config.FrontendProperties;
import np.com.abhishekojha.notificationservice.dto.InviteEmailRequest;
import np.com.abhishekojha.notificationservice.dto.ReminderEmailRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter
            .ofPattern("MMM d, yyyy 'at' HH:mm 'UTC'")
            .withZone(ZoneOffset.UTC);

    private final SendGrid sendGrid;
    private final EmailProperties props;
    private final FrontendProperties frontend;
    private final SpringTemplateEngine templateEngine;

    public void sendUserInvitation(InviteEmailRequest req) {
        String subject = "You've been invited to join " + req.getTenantName();
        send(req.getRecipientEmail(), subject, renderInviteUser(req));
    }

    public void sendAdminInvitation(InviteEmailRequest req) {
        String subject = "You've been invited as Administrator of " + req.getTenantName();
        send(req.getRecipientEmail(), subject, renderInviteAdmin(req));
    }

    public void sendReminder(ReminderEmailRequest req) {
        String subject = "Payment Reminder – " + req.getProductName() + " due " + req.getDueDate();
        send(req.getCustomerEmail(), subject, renderReminder(req));
    }

    // ── template rendering ────────────────────────────────────────────────────

    private String renderInviteAdmin(InviteEmailRequest req) {
        return render("email/invite-admin", Map.of(
                "tenantName", req.getTenantName(),
                "acceptUrl",  buildAcceptInviteUrl(req.getInviteToken()),
                "expiry",     req.getExpiresAt() != null ? DATE_FMT.format(req.getExpiresAt()) : "N/A"
        ));
    }

    private String renderInviteUser(InviteEmailRequest req) {
        return render("email/invite-user", Map.of(
                "tenantName", req.getTenantName(),
                "role",       req.getRole() != null ? req.getRole().display() : "User",
                "acceptUrl",  buildAcceptInviteUrl(req.getInviteToken()),
                "expiry",     req.getExpiresAt() != null ? DATE_FMT.format(req.getExpiresAt()) : "N/A"
        ));
    }

    private String renderReminder(ReminderEmailRequest req) {
        Map<String, Object> vars = new java.util.HashMap<>();
        vars.put("customerName",  req.getCustomerName());
        vars.put("productName",   req.getProductName());
        vars.put("planName",      req.getPlanName());
        vars.put("amount",        req.getAmount());
        vars.put("dueDate",       req.getDueDate());
        vars.put("tenantName",    req.getTenantName());
        vars.put("invoiceNumber", req.getInvoiceNumber() != null ? req.getInvoiceNumber() : "N/A");
        return render("email/reminder", vars);
    }

    private String render(String template, Map<String, Object> vars) {
        Context ctx = new Context();
        ctx.setVariables(vars);
        return templateEngine.process(template, ctx);
    }

    // ── email delivery ────────────────────────────────────────────────────────

    private void send(String toAddress, String subject, String htmlBody) {
        if (toAddress == null || toAddress.isBlank()) {
            throw new IllegalArgumentException("Recipient email address is required");
        }
        Email from = new Email(props.getFromEmail(), props.getFromName());
        Email to   = new Email(toAddress);
        Mail mail  = new Mail(from, subject, to, new Content("text/html", htmlBody));

        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sendGrid.api(request);
            if (response.getStatusCode() >= 400) {
                log.warn("SendGrid rejected email to {} — status={} body={}",
                        toAddress, response.getStatusCode(), response.getBody());
            } else {
                log.info("Email sent to {} — status={}", toAddress, response.getStatusCode());
            }
        } catch (IOException e) {
            log.error("Failed to send email to {}: {}", toAddress, e.getMessage());
            throw new RuntimeException("Email delivery failed", e);
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private String buildAcceptInviteUrl(String token) {
        String base = frontend.getBaseUrl();
        if (base == null || base.isBlank()) {
            throw new IllegalStateException("frontend.base-url is not configured");
        }
        String trimmedBase = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        String path = frontend.getAcceptInvitePath();
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        String encoded = URLEncoder.encode(token == null ? "" : token, StandardCharsets.UTF_8);
        return trimmedBase + path + "?token=" + encoded;
    }
}
