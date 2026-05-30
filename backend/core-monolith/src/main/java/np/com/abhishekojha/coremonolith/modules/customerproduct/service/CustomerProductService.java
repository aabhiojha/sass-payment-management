package np.com.abhishekojha.coremonolith.modules.customerproduct.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.CustomerProductStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.customer.model.CustomerEntity;
import np.com.abhishekojha.coremonolith.modules.customer.repository.CustomerRepository;
import np.com.abhishekojha.coremonolith.modules.customerproduct.dto.AssignProductRequest;
import np.com.abhishekojha.coremonolith.modules.customerproduct.dto.CustomerProductResponse;
import np.com.abhishekojha.coremonolith.modules.customerproduct.dto.UpdateCustomerProductRequest;
import np.com.abhishekojha.coremonolith.modules.customerproduct.dto.UpdateCustomerProductStatusRequest;
import np.com.abhishekojha.coremonolith.modules.customerproduct.model.CustomerProductEntity;
import np.com.abhishekojha.coremonolith.modules.customerproduct.repository.CustomerProductRepository;
import np.com.abhishekojha.coremonolith.modules.product.model.ProductEntity;
import np.com.abhishekojha.coremonolith.modules.product.model.ProductPlanEntity;
import np.com.abhishekojha.coremonolith.modules.product.repository.ProductPlanRepository;
import np.com.abhishekojha.coremonolith.modules.product.repository.ProductRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class CustomerProductService {

    private final CustomerProductRepository customerProductRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final ProductPlanRepository productPlanRepository;
    private final TenantRepository tenantRepository;
    private final TenantAccessGuard guard;
    private final AuditService auditService;

    public CustomerProductResponse assign(Long tenantId, Long customerId, AssignProductRequest req) {
        UserEntity userEntity = guard.requireTenantAccess(tenantId);
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));
        CustomerEntity customer = customerRepository.findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found: " + customerId));
        ProductEntity product = productRepository.findByIdAndTenantIdAndDeletedAtIsNull(req.productId(), tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + req.productId()));

        CustomerProductEntity cp = new CustomerProductEntity();
        cp.setTenant(tenant);
        cp.setCustomer(customer);
        cp.setProduct(product);

        if (req.planId() != null) {
            ProductPlanEntity plan = productPlanRepository
                    .findByIdAndProductIdAndTenantId(req.planId(), req.productId(), tenantId)
                    .orElseThrow(() -> new EntityNotFoundException("Product plan not found: " + req.planId()));
            cp.setProductPlan(plan);
        }
        if (req.customPrice() != null) cp.setCustomPrice(req.customPrice());

        if (req.startsAt() != null) cp.setStartsAt(req.startsAt());
        if (req.endsAt() != null) {
            if (req.endsAt().isBefore(cp.getStartsAt())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ends_at must be after starts_at");
            }
            cp.setEndsAt(req.endsAt());
        }
        if (req.notes() != null) cp.setNotes(req.notes());
        customerProductRepository.save(cp);

        auditService.log(AuditAction.CREATE, "CUSTOMER_PRODUCT", cp.getId(),
                null, Map.of("customerId", customerId, "productId", req.productId()));
        log.debug("Plan assigned id={} customerId={} productId={} tenantId={}", cp.getId(), customerId, req.productId(), tenantId);
        return CustomerProductResponse.from(cp);
    }

    @Transactional(readOnly = true)
    public Page<CustomerProductResponse> listByCustomer(Long tenantId, Long customerId, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        requireCustomerExists(tenantId, customerId);
        return customerProductRepository
                .findAllByTenantIdAndCustomerIdAndDeletedAtIsNull(tenantId, customerId, pageable)
                .map(CustomerProductResponse::from);
    }

    @Transactional(readOnly = true)
    public CustomerProductResponse get(Long tenantId, Long customerId, Long cpId) {
        guard.requireTenantAccess(tenantId);
        return CustomerProductResponse.from(findCp(tenantId, customerId, cpId));
    }

    public CustomerProductResponse update(Long tenantId, Long customerId, Long cpId, UpdateCustomerProductRequest req) {
        guard.requireTenantAccess(tenantId);
        CustomerProductEntity cp = findCp(tenantId, customerId, cpId);
        CustomerProductResponse oldState = CustomerProductResponse.from(cp);

        if (req.startsAt() != null) cp.setStartsAt(req.startsAt());
        if (req.endsAt() != null) cp.setEndsAt(req.endsAt());
        if (req.notes() != null) cp.setNotes(req.notes());

        auditService.log(AuditAction.UPDATE, "CUSTOMER_PRODUCT", cpId, oldState, CustomerProductResponse.from(cp));
        return CustomerProductResponse.from(cp);
    }

    public CustomerProductResponse updateStatus(Long tenantId, Long customerId, Long cpId, UpdateCustomerProductStatusRequest req) {
        guard.requireTenantAccess(tenantId);
        CustomerProductEntity cp = findCp(tenantId, customerId, cpId);
        CustomerProductResponse oldState = CustomerProductResponse.from(cp);

        cp.setStatus(req.status());

        auditService.log(AuditAction.STATUS_CHANGE, "CUSTOMER_PRODUCT", cpId, oldState, CustomerProductResponse.from(cp));
        return CustomerProductResponse.from(cp);
    }

    public void delete(Long tenantId, Long customerId, Long cpId) {
        guard.requireTenantAccess(tenantId);
        CustomerProductEntity cp = findCp(tenantId, customerId, cpId);
        cp.setDeletedAt(Instant.now());
        cp.setDeletedBy(guard.currentUser());

        auditService.log(AuditAction.DELETE, "CUSTOMER_PRODUCT", cpId,
                Map.of("customerId", customerId, "productId", cp.getProduct().getId()), null);
        log.debug("Plan deleted id={} customerId={} tenantId={}", cpId, customerId, tenantId);
    }

    @Transactional(readOnly = true)
    public Page<CustomerProductResponse> listByTenant(Long tenantId, CustomerProductStatus status, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        if (status != null) {
            return customerProductRepository.findAllByTenantIdAndStatusAndDeletedAtIsNull(tenantId, status, pageable)
                    .map(CustomerProductResponse::from);
        }
        return customerProductRepository.findAllByTenantIdAndDeletedAtIsNull(tenantId, pageable)
                .map(CustomerProductResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<CustomerProductResponse> listByProduct(Long tenantId, Long productId, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        productRepository.findByIdAndTenantIdAndDeletedAtIsNull(productId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + productId));
        return customerProductRepository
                .findAllByTenantIdAndProductIdAndDeletedAtIsNull(tenantId, productId, pageable)
                .map(CustomerProductResponse::from);
    }

    private CustomerProductEntity findCp(Long tenantId, Long customerId, Long cpId) {
        return customerProductRepository
                .findByIdAndTenantIdAndCustomerIdAndDeletedAtIsNull(cpId, tenantId, customerId)
                .orElseThrow(() -> new EntityNotFoundException("Customer product not found: " + cpId));
    }

    private void requireCustomerExists(Long tenantId, Long customerId) {
        customerRepository.findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found: " + customerId));
    }
}
