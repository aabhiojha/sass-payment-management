package np.com.abhishekojha.coremonolith.modules.dashboard.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.*;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.audit.dto.AuditLogResponse;
import np.com.abhishekojha.coremonolith.modules.audit.repository.AuditLogRepository;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditTargetResolver;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import np.com.abhishekojha.coremonolith.modules.customer.repository.CustomerRepository;
import np.com.abhishekojha.coremonolith.modules.subscription.repository.CustomerProductRepository;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.superadmin.AdminSummaryResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.OverduePlanResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.ReminderStatsResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.RevenueByCurrencyResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.TenantSummaryResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.UpcomingReminderResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.superadmin.GlobalTenantsSummaryResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.superadmin.RemaindersSummary;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.superadmin.UsersSummary;
import np.com.abhishekojha.coremonolith.modules.platformplan.repository.TenantPlatformPlanRepository;
import np.com.abhishekojha.coremonolith.modules.product.repository.ProductRepository;
import np.com.abhishekojha.coremonolith.modules.reminder.repository.ReminderRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private static final int UPCOMING_WINDOW_DAYS = 7;
    private static final int DEFAULT_STATS_RANGE_DAYS = 30;

    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final CustomerProductRepository customerProductRepository;
    private final ReminderRepository reminderRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditTargetResolver auditTargetResolver;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final TenantAccessGuard guard;
    private final TenantPlatformPlanRepository tenantPlatformPlanRepository;

    public TenantSummaryResponse getSummary(Long tenantId) {
        guard.requireTenantAccess(tenantId);
        log.info("Fetching dashboard summary for tenant={}", tenantId);
        return new TenantSummaryResponse(
                customerRepository.countByTenantIdAndDeletedAtIsNull(tenantId),
                productRepository.countByTenantIdAndDeletedAtIsNull(tenantId),
                customerProductRepository.countByTenantIdAndStatusAndDeletedAtIsNull(tenantId, SubscriptionStatus.ACTIVE),
                customerProductRepository.countByTenantIdAndStatusAndDeletedAtIsNull(tenantId, SubscriptionStatus.PAUSED),
                customerProductRepository.countByTenantIdAndStatusAndDeletedAtIsNull(tenantId, SubscriptionStatus.CANCELLED)
        );
    }

    public RevenueByCurrencyResponse getRevenue(Long tenantId) {
        guard.requireTenantAccess(tenantId);
        log.info("Fetching revenue overview for tenant={}", tenantId);
        List<Object[]> rows = customerProductRepository.sumRevenueByTenantGroupedByCurrency(tenantId);
        List<RevenueByCurrencyResponse.CurrencyTotal> totals = rows.stream()
                .map(row -> new RevenueByCurrencyResponse.CurrencyTotal(
                        (String) row[0],
                        (BigDecimal) row[1],
                        (Long) row[2]
                ))
                .toList();
        return new RevenueByCurrencyResponse(totals);
    }

    public ReminderStatsResponse getReminderStats(Long tenantId, LocalDate from, LocalDate to) {
        guard.requireTenantAccess(tenantId);

        if (to == null) to = LocalDate.now();
        if (from == null) from = to.minusDays(DEFAULT_STATS_RANGE_DAYS);

        log.info("Fetching reminder stats for tenant={} from={} to={}", tenantId, from, to);
        Instant fromInstant = from.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        long sent = reminderRepository.countByTenantIdAndStatusAndCreatedAtBetween(tenantId, ReminderStatus.SENT, fromInstant, toInstant);
        long failed = reminderRepository.countByTenantIdAndStatusAndCreatedAtBetween(tenantId, ReminderStatus.FAILED, fromInstant, toInstant);
        long skipped = reminderRepository.countByTenantIdAndStatusAndCreatedAtBetween(tenantId, ReminderStatus.SKIPPED, fromInstant, toInstant);

        return new ReminderStatsResponse(from, to, sent, failed, skipped, sent + failed + skipped);
    }

    public List<UpcomingReminderResponse> getUpcomingReminders(Long tenantId) {
        guard.requireTenantAccess(tenantId);
        log.info("Fetching upcoming reminders for tenant={}", tenantId);
        Instant now = Instant.now();
        Instant windowEnd = now.plus(UPCOMING_WINDOW_DAYS, ChronoUnit.DAYS);
        return customerProductRepository
                .findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(tenantId, SubscriptionStatus.ACTIVE, now, windowEnd)
                .stream()
                .map(UpcomingReminderResponse::from)
                .toList();
    }

    public List<OverduePlanResponse> getOverduePlans(Long tenantId) {
        guard.requireTenantAccess(tenantId);
        log.info("Fetching overdue plans for tenant={}", tenantId);
        return customerProductRepository
                .findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBefore(tenantId, SubscriptionStatus.ACTIVE, Instant.now())
                .stream()
                .map(OverduePlanResponse::from)
                .toList();
    }

    public List<AuditLogResponse> getRecentActivity(Long tenantId) {
        guard.requireTenantAccess(tenantId);
        log.info("Fetching recent activity for tenant={}", tenantId);
        List<AuditAction> excluded = List.of(AuditAction.USER_LOGIN, AuditAction.USER_LOGOUT, AuditAction.USER_LOGIN_FAILED);
        var logs = auditLogRepository.findTop10ByTenantId(tenantId, excluded, PageRequest.of(0, 10));
        Map<String, String> targets = auditTargetResolver.resolveLabels(logs);
        return logs.stream()
                .map(e -> AuditLogResponse.from(e,
                        targets.get(AuditTargetResolver.key(e.getResourceType(), e.getResourceId()))))
                .toList();
    }

    public AdminSummaryResponse getAdminSummary() {
        log.info("Fetching platform-wide admin dashboard");


        GlobalTenantsSummaryResponse tenantsSummary = GlobalTenantsSummaryResponse.builder()
                .active(tenantRepository.countByStatusAndDeletedAtIsNull(TenantStatus.ACTIVE))
                .suspended(tenantRepository.countByStatusAndDeletedAtIsNull(TenantStatus.SUSPENDED))
                .archived(tenantRepository.countByStatusAndDeletedAtIsNull(TenantStatus.ARCHIVED))
                .newThisWeek(tenantRepository.countByCreatedAtAfterAndArchivedAtIsNull(Instant.now().minus(7, ChronoUnit.DAYS)))
                .expiringThisWeek(tenantPlatformPlanRepository.countByStatusAndEndDateAfter(PlatformPlanStatus.ACTIVE, Instant.now().plus(7, ChronoUnit.DAYS)))
                .build();

        UsersSummary usersSummary = UsersSummary.builder()
                .totalUsers(userRepository.countByDeletedAtIsNull())
                .activeUsers(userRepository.countByStatusAndDeletedAtIsNull(UserStatus.ACTIVE))
                .build();

        long sent = reminderRepository.countByStatus(ReminderStatus.SENT);
        long failed = reminderRepository.countByStatus(ReminderStatus.FAILED);
        long skipped = reminderRepository.countByStatus(ReminderStatus.SKIPPED);
        long total = sent + failed + skipped;

        RemaindersSummary remaindersSummary = RemaindersSummary.builder()
                .sent(sent)
                .failed(failed)
                .skipped(skipped)
                .pending(reminderRepository.countBySentAtIsNull())
                .overdue(0)
                .failureRate(total > 0 ? (double) failed / total * 100 : 0)
                .build();

        return AdminSummaryResponse.builder()
                .tenants(tenantsSummary)
                .users(usersSummary)
                .remainders(remaindersSummary)
                .build();
    }
}
