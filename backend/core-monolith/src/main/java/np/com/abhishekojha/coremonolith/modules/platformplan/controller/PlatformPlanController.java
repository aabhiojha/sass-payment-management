package np.com.abhishekojha.coremonolith.modules.platformplan.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.CreatePlatformPlanRequest;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.PlatformPlanResponse;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.UpdatePlatformPlanRequest;
import np.com.abhishekojha.coremonolith.modules.platformplan.service.PlatformPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/platform-plans")
@RequiredArgsConstructor
@Tag(name = "Platform Plans", description = "SaaS subscription plans for tenants (Super Admin only)")
@SecurityRequirement(name = "bearerAuth")
public class PlatformPlanController {

    private final PlatformPlanService planService;

    @Operation(summary = "Create a platform plan")
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PlatformPlanResponse> create(@Valid @RequestBody CreatePlatformPlanRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(planService.create(req));
    }

    @Operation(summary = "List platform plans", description = "Pass active=true to return only non-archived plans")
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<PlatformPlanResponse>> list(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        List<PlatformPlanResponse> result = activeOnly ? planService.listActive() : planService.list();
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Get a platform plan by ID")
    @GetMapping("/{planId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PlatformPlanResponse> get(@PathVariable Long planId) {
        return ResponseEntity.ok(planService.get(planId));
    }

    @Operation(summary = "Update a platform plan")
    @PatchMapping("/{planId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PlatformPlanResponse> update(
            @PathVariable Long planId,
            @Valid @RequestBody UpdatePlatformPlanRequest req) {
        return ResponseEntity.ok(planService.update(planId, req));
    }

    @Operation(summary = "Archive a platform plan")
    @PostMapping("/{planId}/archive")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PlatformPlanResponse> archive(@PathVariable Long planId) {
        return ResponseEntity.ok(planService.archive(planId));
    }
}
