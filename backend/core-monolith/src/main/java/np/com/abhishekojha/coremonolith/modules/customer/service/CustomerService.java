package np.com.abhishekojha.coremonolith.modules.customer.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.CustomerStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.customer.dto.CreateCustomerRequest;
import np.com.abhishekojha.coremonolith.modules.customer.dto.CustomerResponse;
import np.com.abhishekojha.coremonolith.modules.customer.dto.UpdateCustomerRequest;
import np.com.abhishekojha.coremonolith.modules.customer.model.CustomerEntity;
import np.com.abhishekojha.coremonolith.modules.customer.repository.CustomerRepository;
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
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final TenantRepository tenantRepository;
    private final TenantAccessGuard guard;
    private final AuditService auditService;

    public CustomerResponse create(Long tenantId, CreateCustomerRequest req) {
        guard.requireTenantAccess(tenantId);
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        if (customerRepository.existsByTenantIdAndEmailAndDeletedAtIsNull(tenantId, req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CUSTOMER_EMAIL_ALREADY_EXISTS");
        }

        CustomerEntity customer = new CustomerEntity();
        customer.setTenant(tenant);
        customer.setName(req.name());
        customer.setEmail(req.email());
        customer.setPhone(req.phone());
        customer.setAddress(req.address());
        customer.setNotes(req.notes());
        customerRepository.save(customer);

        auditService.log(AuditAction.CREATE, "CUSTOMER", customer.getId(), null,
                Map.of("name", customer.getName(), "email", customer.getEmail()));
        return CustomerResponse.from(customer);
    }

    @Transactional(readOnly = true)
    public Page<CustomerResponse> list(Long tenantId, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        return customerRepository.findAllByTenantIdAndDeletedAtIsNull(tenantId, pageable)
                .map(CustomerResponse::from);
    }

    @Transactional(readOnly = true)
    public CustomerResponse get(Long tenantId, Long customerId) {
        guard.requireTenantAccess(tenantId);
        return CustomerResponse.from(findCustomer(tenantId, customerId));
    }

    public CustomerResponse update(Long tenantId, Long customerId, UpdateCustomerRequest req) {
        guard.requireTenantAccess(tenantId);
        CustomerEntity customer = findCustomer(tenantId, customerId);
        CustomerResponse oldState = CustomerResponse.from(customer);

        if (req.email() != null && !req.email().equals(customer.getEmail())) {
            if (customerRepository.existsByTenantIdAndEmailAndDeletedAtIsNull(tenantId, req.email())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "CUSTOMER_EMAIL_ALREADY_EXISTS");
            }
            customer.setEmail(req.email());
        }
        if (req.name() != null) customer.setName(req.name());
        if (req.phone() != null) customer.setPhone(req.phone());
        if (req.address() != null) customer.setAddress(req.address());
        if (req.notes() != null) customer.setNotes(req.notes());

        auditService.log(AuditAction.UPDATE, "CUSTOMER", customerId, oldState, CustomerResponse.from(customer));
        return CustomerResponse.from(customer);
    }

    public void delete(Long tenantId, Long customerId) {
        guard.requireTenantAccess(tenantId);
        CustomerEntity customer = findCustomer(tenantId, customerId);
        customer.setStatus(CustomerStatus.DELETED);
        customer.setDeletedAt(Instant.now());
        customer.setDeletedBy(guard.currentUser());

        auditService.log(AuditAction.DELETE, "CUSTOMER", customerId,
                Map.of("name", customer.getName(), "email", customer.getEmail()), null);
    }

    private CustomerEntity findCustomer(Long tenantId, Long customerId) {
        return customerRepository.findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found: " + customerId));
    }
}
