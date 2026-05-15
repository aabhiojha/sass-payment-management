package np.com.abhishekojha.coremonolith.modules.tenant.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.CreateTenantRequest;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.TenantResponse;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.UpdateTenantRequest;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class TenantSuperAdminService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public TenantResponse createTenant(CreateTenantRequest req) {
        TenantEntity tenant = new TenantEntity();
        tenant.setName(req.name());
        tenant.setSlug(generateUniqueSlug(req.name()));
        tenant.setCompanyEmail(req.companyEmail());
        tenant.setTimezone(req.timezone());
        tenantRepository.save(tenant);

        auditService.log(AuditAction.CREATE, "TENANT", tenant.getId(), null,
                Map.of("name", tenant.getName(), "slug", tenant.getSlug(),
                        "companyEmail", tenant.getCompanyEmail()));
        log.info("Tenant created id={} slug={}", tenant.getId(), tenant.getSlug());
        return TenantResponse.from(tenant);
    }

    @Transactional(readOnly = true)
    public Page<TenantResponse> listTenants(TenantStatus status, Pageable pageable) {
        if (status != null) {
            return tenantRepository.findAllByStatusAndDeletedAtIsNull(status, pageable).map(TenantResponse::from);
        }
        return tenantRepository.findAllByDeletedAtIsNull(pageable).map(TenantResponse::from);
    }

    @Transactional(readOnly = true)
    public TenantResponse getTenant(Long id) {
        return TenantResponse.from(findActive(id));
    }

    public TenantResponse updateTenant(Long id, UpdateTenantRequest req) {
        TenantEntity tenant = findActive(id);
        TenantResponse oldState = TenantResponse.from(tenant);

        if (req.name() != null) tenant.setName(req.name());
        if (req.companyEmail() != null) tenant.setCompanyEmail(req.companyEmail());
        if (req.timezone() != null) tenant.setTimezone(req.timezone());

        TenantResponse newState = TenantResponse.from(tenant);
        auditService.log(AuditAction.UPDATE, "TENANT", id, oldState, newState);
        return newState;
    }

    public TenantResponse suspend(Long id) {
        TenantEntity tenant = findActive(id);
        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION");
        }
        tenant.setStatus(TenantStatus.SUSPENDED);
        auditService.log(AuditAction.STATUS_CHANGE, "TENANT", id,
                Map.of("status", "ACTIVE"), Map.of("status", "SUSPENDED"));
        log.info("Tenant suspended id={}", id);
        return TenantResponse.from(tenant);
    }

    public TenantResponse archive(Long id) {
        TenantEntity tenant = findActive(id);
        if (tenant.getStatus() == TenantStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION");
        }
        String previousStatus = tenant.getStatus().name();
        tenant.setStatus(TenantStatus.ARCHIVED);
        tenant.setArchivedAt(Instant.now());
        tenant.setDeletedAt(Instant.now());
        tenant.setDeletedBy(userRepository.findByEmailAndDeletedAtIsNull(currentUserEmail())
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found")));
        auditService.log(AuditAction.STATUS_CHANGE, "TENANT", id,
                Map.of("status", previousStatus), Map.of("status", "ARCHIVED"));
        log.info("Tenant archived id={} previousStatus={}", id, previousStatus);
        return TenantResponse.from(tenant);
    }

    private TenantEntity findActive(Long id) {
        return tenantRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + id));
    }

    private String generateUniqueSlug(String name) {
        String base = name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "")
                .substring(0, Math.min(name.length(), 50));

        if (!tenantRepository.existsBySlug(base)) return base;

        int suffix = 2;
        String candidate;
        do {
            String suffixStr = "-" + suffix++;
            int maxBase = 50 - suffixStr.length();
            candidate = base.substring(0, Math.min(base.length(), maxBase)) + suffixStr;
        } while (tenantRepository.existsBySlug(candidate));
        return candidate;
    }

    private String currentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
