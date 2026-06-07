package np.com.abhishekojha.coremonolith.modules.platformplan.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.AssignPlatformPlanRequest;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.TenantPlatformPlanResponse;
import np.com.abhishekojha.coremonolith.modules.platformplan.service.TenantPlatformPlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/platform-plan")
@RequiredArgsConstructor
@Tag(name = "Tenant Platform Plans", description = "Manage subscription plan assignments per tenant")
@SecurityRequirement(name = "bearerAuth")
public class TenantPlatformPlanController {

    private final TenantPlatformPlanService tenantPlanService;

    @Operation(summary = "Assign (or change) a plan for a tenant")
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<TenantPlatformPlanResponse> assign(
            @PathVariable Long tenantId,
            @Valid @RequestBody AssignPlatformPlanRequest req) {
        return ResponseEntity.ok(tenantPlanService.assign(tenantId, req));
    }

    @Operation(summary = "Get the currently active plan for a tenant")
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<TenantPlatformPlanResponse> getCurrent(@PathVariable Long tenantId) {
        return ResponseEntity.ok(tenantPlanService.getCurrentPlan(tenantId));
    }

    @Operation(summary = "List plan subscription history for a tenant")
    @GetMapping("/history")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<TenantPlatformPlanResponse>> listHistory(@PathVariable Long tenantId) {
        return ResponseEntity.ok(tenantPlanService.listHistory(tenantId));
    }
}
