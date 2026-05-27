package np.com.abhishekojha.coremonolith.modules.audit.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.audit.dto.AuditLogResponse;
import np.com.abhishekojha.coremonolith.modules.audit.repository.AuditLogRepository;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Immutable activity log (Super Admin only)")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @Operation(summary = "List audit logs", description = "All filters are optional and combinable. actions and resourceTypes accept multiple comma-separated values.")
    @GetMapping
    public ResponseEntity<Page<AuditLogResponse>> list(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) List<String> actions,
            @RequestParam(required = false) List<String> resourceTypes,
            @RequestParam(required = false) Long resourceId,
            @RequestParam(required = false) String actorEmail,
            @ParameterObject @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(
                auditLogRepository.findFiltered(
                        actorId,
                        actions != null ? actions : Collections.emptyList(),
                        resourceTypes != null ? resourceTypes : Collections.emptyList(),
                        resourceId,
                        actorEmail,
                        pageable
                ).map(AuditLogResponse::from)
        );
    }
}
