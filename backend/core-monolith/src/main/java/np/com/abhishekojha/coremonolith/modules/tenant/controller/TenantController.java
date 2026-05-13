package np.com.abhishekojha.coremonolith.modules.tenant.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InviteAdminRequest;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InvitationResponse;
import np.com.abhishekojha.coremonolith.modules.invitation.service.InvitationService;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.CreateTenantRequest;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.TenantResponse;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.UpdateTenantRequest;
import np.com.abhishekojha.coremonolith.modules.tenant.service.TenantSuperAdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class TenantController {

    private final TenantSuperAdminService tenantSuperAdminService;
    private final InvitationService invitationService;

    @PostMapping
    public ResponseEntity<TenantResponse> createTenant(@Valid @RequestBody CreateTenantRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tenantSuperAdminService.createTenant(req));
    }

    @GetMapping
    public ResponseEntity<Page<TenantResponse>> listTenants(
            @RequestParam(required = false) TenantStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(tenantSuperAdminService.listTenants(status, pageable));
    }

    @GetMapping("/{tenantId}")
    public ResponseEntity<TenantResponse> getTenant(@PathVariable Long tenantId) {
        return ResponseEntity.ok(tenantSuperAdminService.getTenant(tenantId));
    }

    @PatchMapping("/{tenantId}")
    public ResponseEntity<TenantResponse> updateTenant(
            @PathVariable Long tenantId,
            @Valid @RequestBody UpdateTenantRequest req) {
        return ResponseEntity.ok(tenantSuperAdminService.updateTenant(tenantId, req));
    }

    @PostMapping("/{tenantId}/suspend")
    public ResponseEntity<TenantResponse> suspendTenant(@PathVariable Long tenantId) {
        return ResponseEntity.ok(tenantSuperAdminService.suspend(tenantId));
    }

    @PostMapping("/{tenantId}/archive")
    public ResponseEntity<TenantResponse> archiveTenant(@PathVariable Long tenantId) {
        return ResponseEntity.ok(tenantSuperAdminService.archive(tenantId));
    }

    @PostMapping("/{tenantId}/invite-admin")
    public ResponseEntity<InvitationResponse> inviteAdmin(
            @PathVariable Long tenantId,
            @Valid @RequestBody InviteAdminRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invitationService.inviteAdmin(tenantId, req));
    }
}
