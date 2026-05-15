package np.com.abhishekojha.coremonolith.modules.reminder.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.modules.reminder.service.ReminderService;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderScheduler {

    private final TenantRepository tenantRepository;
    private final ReminderService reminderService;

    // Runs every day at 08:00 UTC
    @Scheduled(cron = "0 0 8 * * *", zone = "UTC")
    public void sendDailyReminders() {
        log.info("Starting daily reminder batch");
        tenantRepository.findAllByStatusAndDeletedAtIsNull(TenantStatus.ACTIVE)
                .forEach(tenant -> {
                    try {
                        int count = reminderService.trigger(tenant.getId()).size();
                        if (count > 0) {
                            log.info("Sent {} reminder(s) for tenant={}", count, tenant.getId());
                        }
                    } catch (Exception e) {
                        log.error("Reminder batch failed for tenant={}: {}", tenant.getId(), e.getMessage());
                    }
                });
        log.info("Daily reminder batch complete");
    }
}
