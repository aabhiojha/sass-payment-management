package np.com.abhishekojha.coremonolith.modules.reminder.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.modules.reminder.service.ReminderService;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderScheduler {

    private final TenantRepository tenantRepository;
    private final ReminderService reminderService;

    // Runs every day at 08:00 UTC
    @Scheduled(cron = "0 0 8 * * *", zone = "UTC")
    public void runDailyJobs() {
        List<TenantEntity> activeTenants = tenantRepository.findAllByStatusAndDeletedAtIsNull(TenantStatus.ACTIVE);
        log.info("Daily reminder batch — {} active tenant(s)", activeTenants.size());

        for (TenantEntity tenant : activeTenants) {
            try {
                // 1. Auto-cancel overdue plans
                int cancelled = reminderService.cancelOverduePlans(tenant);
                if (cancelled > 0) {
                    log.info("Auto-cancelled {} overdue plan(s) for tenant={}", cancelled, tenant.getId());
                }

                // 2. Send milestone reminders (30d, 7d, 1d)
                int sent = (int) reminderService.triggerForTenant(tenant).stream()
                        .filter(r -> "SENT".equals(r.status()))
                        .count();
                if (sent > 0) {
                    log.info("Sent {} reminder(s) for tenant={}", sent, tenant.getId());
                }

                // 3. Retry failed reminders from the last 48 hours
                int retried = reminderService.retryFailed(tenant);
                if (retried > 0) {
                    log.info("Retried {} failed reminder(s) for tenant={}", retried, tenant.getId());
                }
            } catch (Exception e) {
                log.error("Daily job failed for tenant={}: {}", tenant.getId(), e.getMessage(), e);
            }
        }

        log.info("Daily reminder batch complete");
    }
}
