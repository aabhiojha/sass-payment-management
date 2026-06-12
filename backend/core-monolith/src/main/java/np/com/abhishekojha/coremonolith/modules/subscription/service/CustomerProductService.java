package np.com.abhishekojha.coremonolith.modules.subscription.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.SubscriptionStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.customer.model.CustomerEntity;
import np.com.abhishekojha.coremonolith.modules.customer.repository.CustomerRepository;
import np.com.abhishekojha.coremonolith.modules.subscription.dto.AssignProductRequest;
import np.com.abhishekojha.coremonolith.modules.subscription.dto.SubscriptionResponse;
import np.com.abhishekojha.coremonolith.modules.subscription.dto.UpdateSubscriptionRequest;
import np.com.abhishekojha.coremonolith.modules.subscription.dto.UpdateSubscriptionStatusRequest;
import np.com.abhishekojha.coremonolith.modules.subscription.model.CustomerProductEntity;
import np.com.abhishekojha.coremonolith.modules.subscription.repository.CustomerProductRepository;
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
import java.time.LocalDate;
import java.time.ZoneId;
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

    public SubscriptionResponse assign(Long tenantId, Long customerId, AssignProductRequest req) {
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
        } else if (product.getBillingCadence() != null) {
            LocalDate startsAtDate = cp.getStartsAt().atZone(ZoneId.systemDefault()).toLocalDate();
            LocalDate endsAtDate = product.getBillingCadence().nextBillingDate(startsAtDate);
            cp.setEndsAt(endsAtDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
        }
        if (req.notes() != null) cp.setNotes(req.notes());
        customerProductRepository.save(cp);

        String planName = cp.getProductPlan() != null ? cp.getProductPlan().getName() : null;
        String desc = planName != null
                ? "Assigned " + cp.getCustomer().getName() + " to " + cp.getProduct().getName() + " (" + planName + ")"
                : "Assigned " + cp.getCustomer().getName() + " to " + cp.getProduct().getName();
        auditService.log(AuditAction.SUBSCRIPTION_CREATED, "CUSTOMER_PRODUCT", cp.getId(),
                null, SubscriptionResponse.from(cp), desc);
        log.debug("Plan assigned id={} customerId={} productId={} tenantId={}", cp.getId(), customerId, req.productId(), tenantId);
        return SubscriptionResponse.from(cp);
    }

    @Transactional(readOnly = true)
    public Page<SubscriptionResponse> listByCustomer(Long tenantId, Long customerId, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        requireCustomerExists(tenantId, customerId);
        return customerProductRepository
                .findAllByTenantIdAndCustomerIdAndDeletedAtIsNull(tenantId, customerId, pageable)
                .map(SubscriptionResponse::from);
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse get(Long tenantId, Long customerId, Long cpId) {
        guard.requireTenantAccess(tenantId);
        return SubscriptionResponse.from(findCp(tenantId, customerId, cpId));
    }

    public SubscriptionResponse update(Long tenantId, Long customerId, Long cpId, UpdateSubscriptionRequest req) {
        guard.requireTenantAccess(tenantId);
        CustomerProductEntity cp = findCp(tenantId, customerId, cpId);
        SubscriptionResponse oldState = SubscriptionResponse.from(cp);

        if (req.startsAt() != null) cp.setStartsAt(req.startsAt());
        if (req.endsAt() != null) cp.setEndsAt(req.endsAt());
        if (req.notes() != null) cp.setNotes(req.notes());

        String planLabel = cp.getProductPlan() != null ? " (" + cp.getProductPlan().getName() + ")" : "";
        auditService.log(AuditAction.SUBSCRIPTION_UPDATED, "CUSTOMER_PRODUCT", cpId, oldState, SubscriptionResponse.from(cp),
                "Updated subscription for " + cp.getCustomer().getName() + " (" + cp.getProduct().getName() + planLabel + ")");
        return SubscriptionResponse.from(cp);
    }

    public SubscriptionResponse updateStatus(Long tenantId, Long customerId, Long cpId, UpdateSubscriptionStatusRequest req) {
        guard.requireTenantAccess(tenantId);
        CustomerProductEntity cp = findCp(tenantId, customerId, cpId);
        SubscriptionResponse oldState = SubscriptionResponse.from(cp);

        cp.setStatus(req.status());

        String statusVerb = switch (req.status()) {
            case ACTIVE -> "Activated";
            case PAUSED -> "Paused";
            case CANCELLED -> "Cancelled";
        };
        AuditAction statusAction = switch (req.status()) {
            case ACTIVE -> AuditAction.SUBSCRIPTION_ACTIVATED;
            case PAUSED -> AuditAction.SUBSCRIPTION_PAUSED;
            case CANCELLED -> AuditAction.SUBSCRIPTION_CANCELLED;
        };
        String planLabel = cp.getProductPlan() != null ? " (" + cp.getProductPlan().getName() + ")" : "";
        auditService.log(statusAction, "CUSTOMER_PRODUCT", cpId, oldState, SubscriptionResponse.from(cp),
                statusVerb + " subscription for " + cp.getCustomer().getName() + " (" + cp.getProduct().getName() + planLabel + ")");
        return SubscriptionResponse.from(cp);
    }

    public void delete(Long tenantId, Long customerId, Long cpId) {
        guard.requireTenantAccess(tenantId);
        CustomerProductEntity cp = findCp(tenantId, customerId, cpId);
        cp.setDeletedAt(Instant.now());
        cp.setDeletedBy(guard.currentUser());

        String planLabel = cp.getProductPlan() != null ? " (" + cp.getProductPlan().getName() + ")" : "";
        auditService.log(AuditAction.SUBSCRIPTION_DELETED, "CUSTOMER_PRODUCT", cpId,
                SubscriptionResponse.from(cp), null,
                "Deleted subscription for " + cp.getCustomer().getName() + " (" + cp.getProduct().getName() + planLabel + ")");
        log.debug("Plan deleted id={} customerId={} tenantId={}", cpId, customerId, tenantId);
    }

    @Transactional(readOnly = true)
    public Page<SubscriptionResponse> listByTenant(Long tenantId, SubscriptionStatus status, String search, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        String q = (search != null && !search.isBlank()) ? search.trim() : null;
        if (q != null) {
            if (status != null) return customerProductRepository.searchByTenantAndStatus(tenantId, status, q, pageable).map(SubscriptionResponse::from);
            return customerProductRepository.searchByTenant(tenantId, q, pageable).map(SubscriptionResponse::from);
        }
        if (status != null) return customerProductRepository.findAllByTenantIdAndStatusAndDeletedAtIsNull(tenantId, status, pageable).map(SubscriptionResponse::from);
        return customerProductRepository.findAllByTenantIdAndDeletedAtIsNull(tenantId, pageable).map(SubscriptionResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<SubscriptionResponse> listByProduct(Long tenantId, Long productId, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        productRepository.findByIdAndTenantIdAndDeletedAtIsNull(productId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + productId));
        return customerProductRepository
                .findAllByTenantIdAndProductIdAndDeletedAtIsNull(tenantId, productId, pageable)
                .map(SubscriptionResponse::from);
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
