package np.com.abhishekojha.coremonolith.modules.reminder.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.SubscriptionStatus;
import np.com.abhishekojha.coremonolith.common.enums.ReminderStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.subscription.model.CustomerProductEntity;
import np.com.abhishekojha.coremonolith.modules.subscription.repository.CustomerProductRepository;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.invitation.client.NotificationClient;
import np.com.abhishekojha.coremonolith.modules.reminder.client.ReminderNotificationPayload;
import np.com.abhishekojha.coremonolith.modules.reminder.dto.ReminderResponse;
import np.com.abhishekojha.coremonolith.modules.reminder.dto.UpcomingReminderResponse;
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

    // Largest possible milestone — used to bound the DB query window.
    private static final int MAX_LOOKAHEAD_DAYS = 60;

    /**
     * Returns the reminder milestones (days before expiry) for a plan of the given duration.
     * D ≤ 14       → [3, 1, 0]
     * 14 < D ≤ 30  → [7, 3, 1, 0]
     * 30 < D ≤ 90  → [21, 14, 7, 0]
     * 90 < D ≤ 180 → [30, 14, 7, 0]
     * D > 180      → [60, 30, 14, 7, 0]
     */
    private static List<Integer> milestonesForDuration(long durationDays) {
        if (durationDays <= 14)  return List.of(3, 1, 0);
        if (durationDays <= 30)  return List.of(7, 3, 1, 0);
        if (durationDays <= 90)  return List.of(21, 14, 7, 0);
        if (durationDays <= 180) return List.of(30, 14, 7, 0);
        return                          List.of(60, 30, 14, 7, 0);
    }

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
    public List<ReminderResponse> listByCustomerProduct(Long tenantId, Long customerProductId) {
        guard.requireTenantAccess(tenantId);
        return reminderRepository.findAllByCustomerProductIdAndTenantIdOrderByCreatedAtDesc(customerProductId, tenantId)
                .stream().map(ReminderResponse::from).toList();
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
        Instant lookAheadEnd = now.plus(MAX_LOOKAHEAD_DAYS, ChronoUnit.DAYS);
        List<ReminderResponse> results = new ArrayList<>();

        // Fetch all active plans expiring within the lookahead window.
        // For each plan we compute its own milestones from its total duration,
        // then check whether today (daysUntilExpiry) matches one of them.
        List<CustomerProductEntity> candidates = customerProductRepository
                .findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(
                        tenant.getId(), SubscriptionStatus.ACTIVE, now, lookAheadEnd);

        for (CustomerProductEntity cp : candidates) {
            if (cp.getStartsAt() == null || cp.getEndsAt() == null) continue;

            long durationDays     = ChronoUnit.DAYS.between(cp.getStartsAt(), cp.getEndsAt());
            int  daysUntilExpiry  = (int) ChronoUnit.DAYS.between(now, cp.getEndsAt());

            List<Integer> milestones = milestonesForDuration(durationDays);
            if (!milestones.contains(daysUntilExpiry)) continue;

            boolean alreadyHandled = reminderRepository
                    .existsByCustomerProductIdAndDaysBeforeExpiryAndStatusIn(
                            cp.getId(), daysUntilExpiry,
                            List.of(ReminderStatus.SENT, ReminderStatus.SKIPPED));

            if (alreadyHandled) {
                log.debug("Skipping milestone={}d for customerProduct={} — already handled",
                        daysUntilExpiry, cp.getId());
                continue;
            }

            results.add(sendReminder(tenant, cp, daysUntilExpiry));
        }

        return results;
    }


    /**
     * Reminders that are due to fire within the next {@code days} days but haven't
     * been sent/skipped yet — computed live from active subscriptions, not persisted.
     */
    @Transactional(readOnly = true)
    public List<UpcomingReminderResponse> listUpcoming(Long tenantId, int days) {
        guard.requireTenantAccess(tenantId);

        Instant now = Instant.now();
        Instant lookAheadEnd = now.plus(MAX_LOOKAHEAD_DAYS, ChronoUnit.DAYS);

        List<CustomerProductEntity> candidates = customerProductRepository
                .findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(
                        tenantId, SubscriptionStatus.ACTIVE, now, lookAheadEnd);

        List<UpcomingReminderResponse> results = new ArrayList<>();

        for (CustomerProductEntity cp : candidates) {
            if (cp.getStartsAt() == null || cp.getEndsAt() == null) continue;

            long durationDays = ChronoUnit.DAYS.between(cp.getStartsAt(), cp.getEndsAt());
            int daysUntilExpiry = (int) ChronoUnit.DAYS.between(now, cp.getEndsAt());

            for (int milestone : milestonesForDuration(durationDays)) {
                if (milestone > daysUntilExpiry) continue;

                int daysUntilReminder = daysUntilExpiry - milestone;
                if (daysUntilReminder > days) continue;

                boolean alreadyHandled = reminderRepository
                        .existsByCustomerProductIdAndDaysBeforeExpiryAndStatusIn(
                                cp.getId(), milestone,
                                List.of(ReminderStatus.SENT, ReminderStatus.SKIPPED));
                if (alreadyHandled) continue;

                results.add(new UpcomingReminderResponse(
                        cp.getId(),
                        cp.getCustomer().getId(),
                        cp.getCustomer().getName(),
                        cp.getProduct().getId(),
                        cp.getProduct().getName(),
                        cp.getProductPlan() != null ? cp.getProductPlan().getName() : null,
                        formatAmount(cp),
                        cp.getEndsAt(),
                        milestone,
                        now.plus(daysUntilReminder, ChronoUnit.DAYS)
                ));
            }
        }

        results.sort(java.util.Comparator.comparing(UpcomingReminderResponse::reminderDate));
        return results;
    }

    public int cancelOverduePlans(TenantEntity tenant) {
        List<CustomerProductEntity> overdue = customerProductRepository
                .findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBefore(
                        tenant.getId(), SubscriptionStatus.ACTIVE, Instant.now());

        for (CustomerProductEntity cp : overdue) {
            cp.setStatus(SubscriptionStatus.CANCELLED);
            auditService.log(null, AuditAction.STATUS_CHANGE, "CUSTOMER_PRODUCT", cp.getId(),
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
            notificationClient.sendReminder(buildPayload(tenant, cp, milestone));
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

    private String formatAmount(CustomerProductEntity cp) {
        if (cp.getCustomPrice() != null) {
            return cp.getProduct().getCurrency() + " " + cp.getCustomPrice().toPlainString();
        } else if (cp.getProductPlan() != null) {
            return cp.getProductPlan().getCurrency() + " " + cp.getProductPlan().getPrice().toPlainString();
        } else {
            return cp.getProduct().getCurrency() + " " + cp.getProduct().getPrice().toPlainString();
        }
    }

    private ReminderNotificationPayload buildPayload(TenantEntity tenant, CustomerProductEntity cp, int daysBeforeExpiry) {
        String amount = formatAmount(cp);
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
                dueDate,
                daysBeforeExpiry
        );
    }
}
