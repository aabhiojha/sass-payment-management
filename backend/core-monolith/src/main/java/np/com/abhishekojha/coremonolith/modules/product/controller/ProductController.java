package np.com.abhishekojha.coremonolith.modules.product.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.ProductStatus;
import np.com.abhishekojha.coremonolith.modules.customerproduct.dto.CustomerProductResponse;
import np.com.abhishekojha.coremonolith.modules.customerproduct.service.CustomerProductService;
import np.com.abhishekojha.coremonolith.modules.product.dto.CreateProductRequest;
import np.com.abhishekojha.coremonolith.modules.product.dto.ProductResponse;
import np.com.abhishekojha.coremonolith.modules.product.dto.UpdateProductRequest;
import np.com.abhishekojha.coremonolith.modules.product.service.ProductService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Product catalogue management")
@SecurityRequirement(name = "bearerAuth")
public class ProductController {

    private final ProductService productService;
    private final CustomerProductService customerProductService;

    @Operation(summary = "Create product")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Product created"),
            @ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<ProductResponse> create(
            @PathVariable Long tenantId,
            @Valid @RequestBody CreateProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(tenantId, req));
    }

    @Operation(summary = "List products")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Page<ProductResponse>> list(
            @PathVariable Long tenantId,
            @Parameter(description = "Filter by status") @RequestParam(required = false) ProductStatus status,
            @Parameter(description = "Search by name") @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(productService.list(tenantId, status, search, pageable));
    }

    @Operation(summary = "Get product by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK"),
            @ApiResponse(responseCode = "404", description = "Product not found")
    })
    @GetMapping("/{productId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<ProductResponse> get(
            @PathVariable Long tenantId,
            @PathVariable Long productId) {
        return ResponseEntity.ok(productService.get(tenantId, productId));
    }

    @Operation(summary = "Update product")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Updated"),
            @ApiResponse(responseCode = "404", description = "Product not found")
    })
    @PatchMapping("/{productId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<ProductResponse> update(
            @PathVariable Long tenantId,
            @PathVariable Long productId,
            @Valid @RequestBody UpdateProductRequest req) {
        return ResponseEntity.ok(productService.update(tenantId, productId, req));
    }

    @Operation(summary = "List customers assigned to this product", description = "Returns customer-product plans linked to the given product")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping("/{productId}/customers")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Page<CustomerProductResponse>> listCustomers(
            @PathVariable Long tenantId,
            @PathVariable Long productId,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(customerProductService.listByProduct(tenantId, productId, pageable));
    }

    @Operation(summary = "Delete product", description = "Soft delete — sets status to DELETED")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Deleted"),
            @ApiResponse(responseCode = "404", description = "Product not found")
    })
    @DeleteMapping("/{productId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long tenantId,
            @PathVariable Long productId) {
        productService.delete(tenantId, productId);
        return ResponseEntity.noContent().build();
    }
}
