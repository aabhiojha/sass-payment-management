package np.com.abhishekojha.coremonolith.modules.reminder.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.CustomerProductStatus;
import np.com.abhishekojha.coremonolith.common.enums.ReminderStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.customerproduct.model.CustomerProductEntity;
import np.com.abhishekojha.coremonolith.modules.customerproduct.repository.CustomerProductRepository;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.invitation.client.NotificationClient;
import np.com.abhishekojha.coremonolith.modules.reminder.client.ReminderNotificationPayload;
import np.com.abhishekojha.coremonolith.modules.reminder.dto.ReminderResponse;
import np.com.abhishekojha.coremonolith.modules.reminder.model.ReminderEntity;
import np.com.abhishekojha.coremonolith.modules.reminder.repository.ReminderRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ReminderService {

    private static final List<Integer> MILESTONES = List.of(2);

    private static final DateTimeFormatter DUE_DATE_FMT =
            DateTimeFormatter.ofPattern("MMM d, yyyy").withZone(ZoneOffset.UTC);

    private final ReminderRepository reminderRepository;
    private final CustomerProductRepository customerProductRepository;
    private final TenantRepository tenantRepository;
    private final TenantAccessGuard guard;
    private final NotificationClient notificationClient;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Page<ReminderResponse> list(Long tenantId, ReminderStatus status, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        if (status != null) {
            return reminderRepository.findAllByTenantIdAndStatus(tenantId, status, pageable)
                    .map(ReminderResponse::from);
        }
        return reminderRepository.findAllByTenantId(tenantId, pageable)
                .map(ReminderResponse::from);
    }

    @Transactional(readOnly = true)
    public ReminderResponse get(Long tenantId, Long reminderId) {
        guard.requireTenantAccess(tenantId);
        return ReminderResponse.from(
                reminderRepository.findByIdAndTenantId(reminderId, tenantId)
                        .orElseThrow(() -> new EntityNotFoundException("Reminder not found: " + reminderId))
        );
    }

    // API-triggered manual run — enforces tenant access
    public List<ReminderResponse> trigger(Long tenantId) {
        guard.requireTenantAccess(tenantId);
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));
        return triggerForTenant(tenant);
    }

    // Called by the scheduler — no security context
    public List<ReminderResponse> triggerForTenant(TenantEntity tenant) {
        Instant now = Instant.now();
        List<ReminderResponse> results = new ArrayList<>();

        for (int milestone : MILESTONES) {
            Instant windowStart = now.plus(milestone - 1, ChronoUnit.DAYS);
            Instant windowEnd   = now.plus(milestone,     ChronoUnit.DAYS).minusSeconds(1);

            List<CustomerProductEntity> duePlans = customerProductRepository
                    .findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(
                            tenant.getId(), CustomerProductStatus.ACTIVE, windowStart, windowEnd);

            for (CustomerProductEntity cp : duePlans) {
                // Skip if the plan hasn't been active long enough for this milestone to make sense.
                // Prevents short plans (e.g. 7-day) from receiving a 7-day reminder on day 0.
                if (cp.getStartsAt() != null &&
                        cp.getStartsAt().plus(milestone, ChronoUnit.DAYS).isAfter(now)) {
                    continue;
                }

                boolean alreadyHandled = reminderRepository
                        .existsByCustomerProductIdAndDaysBeforeExpiryAndStatusIn(
                                cp.getId(), milestone,
                                List.of(ReminderStatus.SENT, ReminderStatus.SKIPPED));

                if (alreadyHandled) {
                    log.debug("Skipping milestone={}d for customerProduct={} — already handled",
                            milestone, cp.getId());
                    continue;
                }

                results.add(sendReminder(tenant, cp, milestone));
            }
        }

        return results;
    }

    public int cancelOverduePlans(TenantEntity tenant) {
        List<CustomerProductEntity> overdue = customerProductRepository
                .findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBefore(
                        tenant.getId(), CustomerProductStatus.ACTIVE, Instant.now());

        for (CustomerProductEntity cp : overdue) {
            cp.setStatus(CustomerProductStatus.CANCELLED);
            auditService.log(AuditAction.STATUS_CHANGE, "CUSTOMER_PRODUCT", cp.getId(),
                    Map.of("status", "ACTIVE"),
                    Map.of("status", "CANCELLED", "reason", "expired"));
            log.info("Auto-cancelled overdue plan id={} endsAt={} customer={}",
                    cp.getId(), cp.getEndsAt(), cp.getCustomer().getId());
        }
        return overdue.size();
    }

    private ReminderResponse sendReminder(TenantEntity tenant, CustomerProductEntity cp, int milestone) {
        ReminderEntity reminder = new ReminderEntity();
        reminder.setTenant(tenant);
        reminder.setCustomerProduct(cp);
        reminder.setDaysBeforeExpiry(milestone);

        try {
            notificationClient.sendReminder(buildPayload(tenant, cp));
            reminder.setStatus(ReminderStatus.SENT);
            reminder.setSentAt(Instant.now());
            log.info("Sent {}d reminder for customerProduct={} customer={}",
                    milestone, cp.getId(), cp.getCustomer().getId());
        } catch (Exception e) {
            log.warn("Reminder dispatch failed for customerProduct={}: {}", cp.getId(), e.getMessage());
            reminder.setStatus(ReminderStatus.FAILED);
            reminder.setErrorMessage(e.getMessage());
        }

        reminderRepository.save(reminder);
        return ReminderResponse.from(reminder);
    }

    private ReminderNotificationPayload buildPayload(TenantEntity tenant, CustomerProductEntity cp) {
        String amount;
        if (cp.getCustomPrice() != null) {
            amount = cp.getProduct().getCurrency() + " " + cp.getCustomPrice().toPlainString();
        } else if (cp.getProductPlan() != null) {
            amount = cp.getProductPlan().getCurrency() + " " + cp.getProductPlan().getPrice().toPlainString();
        } else {
            amount = cp.getProduct().getCurrency() + " " + cp.getProduct().getPrice().toPlainString();
        }

        String planName = cp.getProductPlan() != null ? cp.getProductPlan().getName() : null;
        String dueDate = cp.getEndsAt() != null ? DUE_DATE_FMT.format(cp.getEndsAt()) : "N/A";

        return new ReminderNotificationPayload(
                tenant.getId(),
                tenant.getName(),
                cp.getCustomer().getName(),
                cp.getCustomer().getEmail(),
                cp.getProduct().getName(),
                planName,
                amount,
                dueDate
        );
    }
}
