package np.com.abhishekojha.coremonolith.modules.reminder.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.CustomerProductStatus;
import np.com.abhishekojha.coremonolith.common.enums.ReminderStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.customerproduct.model.CustomerProductEntity;
import np.com.abhishekojha.coremonolith.modules.customerproduct.repository.CustomerProductRepository;
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
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ReminderService {

    private static final int REMINDER_WINDOW_DAYS = 7;
    private static final DateTimeFormatter DUE_DATE_FMT =
            DateTimeFormatter.ofPattern("MMM d, yyyy").withZone(ZoneOffset.UTC);

    private final ReminderRepository reminderRepository;
    private final CustomerProductRepository customerProductRepository;
    private final TenantRepository tenantRepository;
    private final TenantAccessGuard guard;
    private final NotificationClient notificationClient;

    @Transactional(readOnly = true)
    public Page<ReminderResponse> list(Long tenantId, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
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

    // Called from API endpoints — enforces tenant access
    public List<ReminderResponse> trigger(Long tenantId) {
        guard.requireTenantAccess(tenantId);
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));
        return triggerForTenant(tenant);
    }

    // Called from the scheduler — no security context available
    public List<ReminderResponse> triggerForTenant(TenantEntity tenant) {
        Instant now = Instant.now();
        Instant windowEnd = now.plus(REMINDER_WINDOW_DAYS, ChronoUnit.DAYS);
        Instant deduplicationCutoff = now.minus(1, ChronoUnit.DAYS);

        List<CustomerProductEntity> duePlans = customerProductRepository
                .findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(
                        tenant.getId(), CustomerProductStatus.ACTIVE, now, windowEnd);

        return duePlans.stream()
                .filter(cp -> !reminderRepository.existsByCustomerProductIdAndStatusAndCreatedAtAfter(
                        cp.getId(), ReminderStatus.SENT, deduplicationCutoff))
                .map(cp -> processOne(tenant, cp))
                .toList();
    }

    private ReminderResponse processOne(TenantEntity tenant, CustomerProductEntity cp) {
        ReminderEntity reminder = new ReminderEntity();
        reminder.setTenant(tenant);
        reminder.setCustomerProduct(cp);

        try {
            // Resolve price: custom_price → plan price → product default price
            String amount;
            if (cp.getCustomPrice() != null) {
                amount = cp.getProduct().getCurrency() + " " + cp.getCustomPrice().toPlainString();
            } else if (cp.getProductPlan() != null) {
                amount = cp.getProductPlan().getCurrency() + " " + cp.getProductPlan().getPrice().toPlainString();
            } else {
                amount = cp.getProduct().getCurrency() + " " + cp.getProduct().getPrice().toPlainString();
            }

            ReminderNotificationPayload payload = new ReminderNotificationPayload(
                    tenant.getId(),
                    tenant.getName(),
                    cp.getCustomer().getName(),
                    cp.getCustomer().getEmail(),
                    cp.getProduct().getName(),
                    amount,
                    DUE_DATE_FMT.format(cp.getEndsAt())
            );
            notificationClient.sendReminder(payload);
            reminder.setStatus(ReminderStatus.SENT);
            reminder.setSentAt(Instant.now());
        } catch (Exception e) {
            log.warn("Reminder dispatch failed for customerProduct={}: {}", cp.getId(), e.getMessage());
            reminder.setStatus(ReminderStatus.FAILED);
            reminder.setErrorMessage(e.getMessage());
        }

        reminderRepository.save(reminder);
        return ReminderResponse.from(reminder);
    }
}
