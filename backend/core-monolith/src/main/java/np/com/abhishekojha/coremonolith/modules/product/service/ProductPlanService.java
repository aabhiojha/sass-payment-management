package np.com.abhishekojha.coremonolith.modules.product.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.product.dto.CreateProductPlanRequest;
import np.com.abhishekojha.coremonolith.modules.product.dto.ProductPlanResponse;
import np.com.abhishekojha.coremonolith.modules.product.model.ProductEntity;
import np.com.abhishekojha.coremonolith.modules.product.model.ProductPlanEntity;
import np.com.abhishekojha.coremonolith.modules.product.repository.ProductPlanRepository;
import np.com.abhishekojha.coremonolith.modules.product.repository.ProductRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class ProductPlanService {

    private final ProductPlanRepository productPlanRepository;
    private final ProductRepository productRepository;
    private final TenantRepository tenantRepository;
    private final TenantAccessGuard guard;

    public ProductPlanResponse create(Long tenantId, Long productId, CreateProductPlanRequest req) {
        guard.requireTenantAccess(tenantId);
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));
        ProductEntity product = productRepository.findByIdAndTenantIdAndDeletedAtIsNull(productId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + productId));

        ProductPlanEntity plan = new ProductPlanEntity();
        plan.setTenant(tenant);
        plan.setProduct(product);
        plan.setName(req.name());
        plan.setPrice(req.price());
        plan.setCurrency(req.currency());
        plan.setBillingCadence(req.billingCadence());

        return ProductPlanResponse.from(productPlanRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public List<ProductPlanResponse> list(Long tenantId, Long productId) {
        guard.requireTenantAccess(tenantId);
        productRepository.findByIdAndTenantIdAndDeletedAtIsNull(productId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + productId));
        return productPlanRepository.findAllByProductIdAndTenantId(productId, tenantId)
                .stream().map(ProductPlanResponse::from).toList();
    }

    public void delete(Long tenantId, Long productId, Long planId) {
        guard.requireTenantAccess(tenantId);
        ProductPlanEntity plan = productPlanRepository
                .findByIdAndProductIdAndTenantId(planId, productId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Product plan not found: " + planId));
        productPlanRepository.delete(plan);
    }
}
