package np.com.abhishekojha.coremonolith.modules.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.auth.dto.UpdateUserRoleRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.UserResponse;
import np.com.abhishekojha.coremonolith.modules.auth.service.TenantUserService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/users")
@RequiredArgsConstructor
@Tag(name = "Tenant Users", description = "User management within a tenant")
@SecurityRequirement(name = "bearerAuth")
public class TenantUserController {

    private final TenantUserService tenantUserService;

    @Operation(summary = "List users in a tenant")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping
    @PreAuthorize("hasAnyRole('TENANT_ADMIN', 'TENANT_USER', 'SUPER_ADMIN')")
    public ResponseEntity<Page<UserResponse>> listUsers(
            @PathVariable Long tenantId,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(tenantUserService.listUsers(tenantId, pageable));
    }

    @Operation(summary = "Get a user by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('TENANT_ADMIN', 'TENANT_USER', 'SUPER_ADMIN')")
    public ResponseEntity<UserResponse> getUser(
            @PathVariable Long tenantId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(tenantUserService.getUser(tenantId, userId));
    }

    @Operation(summary = "Update a user's role", description = "Allowed roles: TENANT_ADMIN, TENANT_USER")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Role updated"),
            @ApiResponse(responseCode = "400", description = "Invalid role"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PatchMapping("/{userId}")
    @PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<UserResponse> updateRole(
            @PathVariable Long tenantId,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest req) {
        return ResponseEntity.ok(tenantUserService.updateRole(tenantId, userId, req));
    }

    @Operation(summary = "Disable a user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User disabled"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PostMapping("/{userId}/disable")
    @PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<UserResponse> disableUser(
            @PathVariable Long tenantId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(tenantUserService.disableUser(tenantId, userId));
    }

    @Operation(summary = "Soft-delete a user")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "User deleted"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @DeleteMapping("/{userId}")
    @PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long tenantId,
            @PathVariable Long userId) {
        tenantUserService.deleteUser(tenantId, userId);
        return ResponseEntity.noContent().build();
    }
}
