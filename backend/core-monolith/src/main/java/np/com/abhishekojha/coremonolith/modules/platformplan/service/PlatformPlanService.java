package np.com.abhishekojha.coremonolith.modules.platformplan.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.PlatformPlanStatus;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.CreatePlatformPlanRequest;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.PlatformPlanResponse;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.UpdatePlatformPlanRequest;
import np.com.abhishekojha.coremonolith.modules.platformplan.model.PlatformPlanEntity;
import np.com.abhishekojha.coremonolith.modules.platformplan.repository.PlatformPlanRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class PlatformPlanService {

    private final PlatformPlanRepository planRepository;
    private final AuditService auditService;

    public PlatformPlanResponse create(CreatePlatformPlanRequest req) {
        PlatformPlanEntity plan = new PlatformPlanEntity();
        plan.setName(req.name());
        plan.setDescription(req.description());
        plan.setPrice(req.price());
        plan.setCurrency(req.currency());
        plan.setBillingCadence(req.billingCadence());

        planRepository.save(plan);
        auditService.log(AuditAction.CREATE, "PLATFORM_PLAN", plan.getId(), null,
                Map.of("name", plan.getName(), "price", plan.getPrice().toString()));
        log.info("Platform plan created id={} name={}", plan.getId(), plan.getName());
        return PlatformPlanResponse.from(plan);
    }

    @Transactional(readOnly = true)
    public List<PlatformPlanResponse> list() {
        return planRepository.findAll().stream().map(PlatformPlanResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PlatformPlanResponse> listActive() {
        return planRepository.findAllByStatus(PlatformPlanStatus.ACTIVE)
                .stream().map(PlatformPlanResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PlatformPlanResponse get(Long id) {
        return PlatformPlanResponse.from(findById(id));
    }

    public PlatformPlanResponse update(Long id, UpdatePlatformPlanRequest req) {
        PlatformPlanEntity plan = findActive(id);
        PlatformPlanResponse oldState = PlatformPlanResponse.from(plan);

        if (req.name() != null) plan.setName(req.name());
        if (req.description() != null) plan.setDescription(req.description());
        if (req.price() != null) plan.setPrice(req.price());
        if (req.currency() != null) plan.setCurrency(req.currency());
        if (req.billingCadence() != null) plan.setBillingCadence(req.billingCadence());

        PlatformPlanResponse newState = PlatformPlanResponse.from(plan);
        auditService.log(AuditAction.UPDATE, "PLATFORM_PLAN", id, oldState, newState);
        return newState;
    }

    public PlatformPlanResponse archive(Long id) {
        PlatformPlanEntity plan = findActive(id);
        plan.setStatus(PlatformPlanStatus.ARCHIVED);
        auditService.log(AuditAction.STATUS_CHANGE, "PLATFORM_PLAN", id,
                Map.of("status", "ACTIVE"), Map.of("status", "ARCHIVED"));
        log.info("Platform plan archived id={}", id);
        return PlatformPlanResponse.from(plan);
    }

    PlatformPlanEntity findById(Long id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Platform plan not found: " + id));
    }

    private PlatformPlanEntity findActive(Long id) {
        return planRepository.findByIdAndStatus(id, PlatformPlanStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Active platform plan not found: " + id));
    }
}
