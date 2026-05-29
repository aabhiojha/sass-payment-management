package np.com.abhishekojha.coremonolith.modules.product.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.product.dto.CreateProductPlanRequest;
import np.com.abhishekojha.coremonolith.modules.product.dto.ProductPlanResponse;
import np.com.abhishekojha.coremonolith.modules.product.service.ProductPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/products/{productId}/plans")
@RequiredArgsConstructor
@Tag(name = "Product Plans", description = "Pricing tiers for a product")
@SecurityRequirement(name = "bearerAuth")
public class ProductPlanController {

    private final ProductPlanService productPlanService;

    @Operation(summary = "List pricing tiers for a product")
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<List<ProductPlanResponse>> list(
            @PathVariable Long tenantId,
            @PathVariable Long productId) {
        return ResponseEntity.ok(productPlanService.list(tenantId, productId));
    }

    @Operation(summary = "Create a pricing tier for a product")
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<ProductPlanResponse> create(
            @PathVariable Long tenantId,
            @PathVariable Long productId,
            @Valid @RequestBody CreateProductPlanRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productPlanService.create(tenantId, productId, req));
    }

    @Operation(summary = "Delete a pricing tier")
    @DeleteMapping("/{planId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long tenantId,
            @PathVariable Long productId,
            @PathVariable Long planId) {
        productPlanService.delete(tenantId, productId, planId);
        return ResponseEntity.noContent().build();
    }
}
