package np.com.abhishekojha.coremonolith.modules.audit.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.audit.dto.AuditLogResponse;
import np.com.abhishekojha.coremonolith.modules.audit.repository.AuditLogRepository;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditTargetResolver;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Immutable activity log")
@SecurityRequirement(name = "bearerAuth")
public class AuditController {

    private final AuditLogRepository auditLogRepository;
    private final TenantAccessGuard tenantAccessGuard;
    private final AuditTargetResolver auditTargetResolver;

    @Operation(summary = "List all audit logs (Super Admin only)", description = "All filters are optional and combinable.")
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<AuditLogResponse>> list(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) List<String> actions,
            @RequestParam(required = false) List<String> resourceTypes,
            @RequestParam(required = false) Long resourceId,
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @ParameterObject @PageableDefault(size = 50) Pageable pageable) {
        var page = auditLogRepository.findFiltered(
                actorId,
                toEnums(actions),
                resourceTypes != null ? resourceTypes : Collections.emptyList(),
                resourceId,
                actorEmail,
                from,
                to,
                pageable
        );
        Map<String, String> targets = auditTargetResolver.resolveLabels(page.getContent());
        return ResponseEntity.ok(page.map(e ->
                AuditLogResponse.from(e, targets.get(AuditTargetResolver.key(e.getResourceType(), e.getResourceId())))));
    }

    @Operation(summary = "List audit logs for the caller's tenant (Tenant Admin only)", description = "Scoped to the authenticated user's tenant. All filters are optional.")
    @GetMapping("/tenant")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Page<AuditLogResponse>> listTenantLogs(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) List<String> actions,
            @RequestParam(required = false) List<String> resourceTypes,
            @RequestParam(required = false) Long resourceId,
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @ParameterObject @PageableDefault(size = 50) Pageable pageable) {
        UserEntity caller = tenantAccessGuard.currentUser();
        Long tenantId = caller.getTenant().getId();
        var page = auditLogRepository.findFilteredByTenant(
                tenantId,
                actorId,
                toEnums(actions),
                resourceTypes != null ? resourceTypes : Collections.emptyList(),
                resourceId,
                actorEmail,
                from,
                to,
                pageable
        );
        Map<String, String> targets = auditTargetResolver.resolveLabels(page.getContent());
        return ResponseEntity.ok(page.map(e ->
                AuditLogResponse.from(e, targets.get(AuditTargetResolver.key(e.getResourceType(), e.getResourceId())))));
    }

    /** Query params arrive as dotted values ("CUSTOMER.CREATED"); the converted action column binds as enums. */
    private static List<AuditAction> toEnums(List<String> actions) {
        if (actions == null) return Collections.emptyList();
        return actions.stream().map(AuditAction::fromValue).toList();
    }
}
