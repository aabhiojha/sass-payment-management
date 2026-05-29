package np.com.abhishekojha.coremonolith.modules.product.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.ProductStatus;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.product.dto.CreateProductRequest;
import np.com.abhishekojha.coremonolith.modules.product.dto.ProductResponse;
import np.com.abhishekojha.coremonolith.modules.product.dto.UpdateProductRequest;
import np.com.abhishekojha.coremonolith.modules.product.model.ProductEntity;
import np.com.abhishekojha.coremonolith.modules.product.repository.ProductRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final TenantRepository tenantRepository;
    private final TenantAccessGuard guard;
    private final AuditService auditService;

    public ProductResponse create(Long tenantId, CreateProductRequest req) {
        guard.requireTenantAccess(tenantId);
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        ProductEntity product = new ProductEntity();
        product.setTenant(tenant);
        product.setName(req.name());
        product.setDescription(req.description());
        product.setPrice(req.price());
        product.setCurrency(req.currency());
        product.setBillingCadence(req.billingCadence());
        productRepository.save(product);

        auditService.log(AuditAction.CREATE, "PRODUCT", product.getId(), null,
                Map.of("name", product.getName(), "price", product.getPrice(),
                        "currency", product.getCurrency(), "billingCadence", product.getBillingCadence().name()));
        log.debug("Product created id={} tenantId={}", product.getId(), tenantId);
        return ProductResponse.from(product);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> list(Long tenantId, ProductStatus status, Pageable pageable) {
        UserEntity caller = guard.requireTenantAccess(tenantId);
        if (status != null) {
            return productRepository.findAllByTenantIdAndStatus(tenantId, status, pageable)
                    .map(ProductResponse::from);
        }
        if (caller.getRole() == UserRole.SUPER_ADMIN) {
            return productRepository.findAllByTenantId(tenantId, pageable)
                    .map(ProductResponse::from);
        }
        return productRepository.findAllByTenantIdAndDeletedAtIsNull(tenantId, pageable)
                .map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long tenantId, Long productId) {
        guard.requireTenantAccess(tenantId);
        return ProductResponse.from(findProduct(tenantId, productId));
    }

    public ProductResponse update(Long tenantId, Long productId, UpdateProductRequest req) {
        guard.requireTenantAccess(tenantId);
        ProductEntity product = findProduct(tenantId, productId);
        ProductResponse oldState = ProductResponse.from(product);

        if (req.name() != null) product.setName(req.name());
        if (req.description() != null) product.setDescription(req.description());
        if (req.price() != null) product.setPrice(req.price());
        if (req.currency() != null) product.setCurrency(req.currency());
        if (req.billingCadence() != null) product.setBillingCadence(req.billingCadence());
        if (req.status() != null) product.setStatus(req.status());

        auditService.log(AuditAction.UPDATE, "PRODUCT", productId, oldState, ProductResponse.from(product));
        return ProductResponse.from(product);
    }

    public void delete(Long tenantId, Long productId) {
        guard.requireTenantAccess(tenantId);
        ProductEntity product = findProduct(tenantId, productId);
        product.setStatus(ProductStatus.DELETED);
        product.setDeletedAt(Instant.now());
        product.setDeletedBy(guard.currentUser());

        auditService.log(AuditAction.DELETE, "PRODUCT", productId,
                Map.of("name", product.getName(), "status", product.getStatus().name()), null);
        log.debug("Product deleted id={} tenantId={}", productId, tenantId);
    }

    private ProductEntity findProduct(Long tenantId, Long productId) {
        return productRepository.findByIdAndTenantIdAndDeletedAtIsNull(productId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + productId));
    }
}
