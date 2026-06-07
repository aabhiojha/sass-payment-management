package np.com.abhishekojha.coremonolith.modules.platformplan.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.PlatformPlanStatus;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.AssignPlatformPlanRequest;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.TenantPlatformPlanResponse;
import np.com.abhishekojha.coremonolith.modules.platformplan.model.PlatformPlanEntity;
import np.com.abhishekojha.coremonolith.modules.platformplan.model.TenantPlatformPlanEntity;
import np.com.abhishekojha.coremonolith.modules.platformplan.repository.TenantPlatformPlanRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class TenantPlatformPlanService {

    private final TenantPlatformPlanRepository tenantPlanRepository;
    private final TenantRepository tenantRepository;
    private final PlatformPlanService platformPlanService;
    private final AuditService auditService;

    public TenantPlatformPlanResponse assign(Long tenantId, AssignPlatformPlanRequest req) {
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        PlatformPlanEntity plan = platformPlanService.findById(req.planId());

        // Supersede the currently active plan if any
        tenantPlanRepository.findByTenantIdAndStatus(tenantId, PlatformPlanStatus.ACTIVE)
                .ifPresent(current -> {
                    current.setStatus(PlatformPlanStatus.ARCHIVED);
                    log.info("Superseded previous plan id={} for tenant={}", current.getId(), tenantId);
                });

        Instant start = req.startDate() != null ? req.startDate() : Instant.now();
        Instant end = req.endDate() != null ? req.endDate() : start.plus(365, ChronoUnit.DAYS);

        TenantPlatformPlanEntity assignment = new TenantPlatformPlanEntity();
        assignment.setTenant(tenant);
        assignment.setPlan(plan);
        assignment.setCustomPrice(req.customPrice());
        assignment.setStartDate(start);
        assignment.setEndDate(end);

        tenantPlanRepository.save(assignment);

        auditService.log(AuditAction.CREATE, "TENANT_PLATFORM_PLAN", assignment.getId(), null,
                Map.of("tenantId", tenantId.toString(), "planId", plan.getId().toString(),
                        "planName", plan.getName()));
        log.info("Assigned plan={} to tenant={} id={}", plan.getName(), tenantId, assignment.getId());
        return TenantPlatformPlanResponse.from(assignment);
    }

    @Transactional(readOnly = true)
    public Optional<TenantPlatformPlanResponse> findActivePlan(Long tenantId) {
        return tenantPlanRepository.findByTenantIdAndStatus(tenantId, PlatformPlanStatus.ACTIVE)
                .map(TenantPlatformPlanResponse::from);
    }

    @Transactional(readOnly = true)
    public TenantPlatformPlanResponse getCurrentPlan(Long tenantId) {
        return tenantPlanRepository.findByTenantIdAndStatus(tenantId, PlatformPlanStatus.ACTIVE)
                .map(TenantPlatformPlanResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("No active plan for tenant: " + tenantId));
    }

    @Transactional(readOnly = true)
    public List<TenantPlatformPlanResponse> listHistory(Long tenantId) {
        return tenantPlanRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream().map(TenantPlatformPlanResponse::from).toList();
    }
}
