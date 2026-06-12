package np.com.abhishekojha.coremonolith.modules.audit.service;

import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.audit.model.AuditLogEntity;
import np.com.abhishekojha.coremonolith.modules.customer.repository.CustomerRepository;
import np.com.abhishekojha.coremonolith.modules.invitation.repository.InvitationRepository;
import np.com.abhishekojha.coremonolith.modules.platformplan.repository.PlatformPlanRepository;
import np.com.abhishekojha.coremonolith.modules.platformplan.repository.TenantPlatformPlanRepository;
import np.com.abhishekojha.coremonolith.modules.product.repository.ProductRepository;
import np.com.abhishekojha.coremonolith.modules.subscription.repository.CustomerProductRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

/**
 * Resolves audit log targets (resourceType + resourceId) to human-readable
 * labels, e.g. CUSTOMER:48 → "John Doe". Lookups are batched per resource
 * type, so a page of logs costs at most one query per distinct type.
 * Soft-deleted entities still resolve since lookups go by primary key.
 */
@Service
@RequiredArgsConstructor
public class AuditTargetResolver {

    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final InvitationRepository invitationRepository;
    private final PlatformPlanRepository platformPlanRepository;
    private final TenantPlatformPlanRepository tenantPlatformPlanRepository;
    private final CustomerProductRepository customerProductRepository;

    @Transactional(readOnly = true)
    public Map<String, String> resolveLabels(Collection<AuditLogEntity> logs) {
        Map<String, Set<Long>> idsByType = new HashMap<>();
        for (AuditLogEntity log : logs) {
            if (log.getResourceId() == null) continue;
            idsByType.computeIfAbsent(log.getResourceType(), t -> new HashSet<>()).add(log.getResourceId());
        }

        Map<String, String> labels = new HashMap<>();
        resolveType(idsByType, "CUSTOMER", ids ->
                customerRepository.findAllById(ids).forEach(c ->
                        labels.put(key("CUSTOMER", c.getId()), c.getName())));
        resolveType(idsByType, "PRODUCT", ids ->
                productRepository.findAllById(ids).forEach(p ->
                        labels.put(key("PRODUCT", p.getId()), p.getName())));
        resolveType(idsByType, "USER", ids ->
                userRepository.findAllById(ids).forEach(u ->
                        labels.put(key("USER", u.getId()), u.getFullName() != null ? u.getFullName() : u.getEmail())));
        resolveType(idsByType, "TENANT", ids ->
                tenantRepository.findAllById(ids).forEach(t ->
                        labels.put(key("TENANT", t.getId()), t.getName())));
        resolveType(idsByType, "INVITATION", ids ->
                invitationRepository.findAllById(ids).forEach(i ->
                        labels.put(key("INVITATION", i.getId()), i.getEmail())));
        resolveType(idsByType, "PLATFORM_PLAN", ids ->
                platformPlanRepository.findAllById(ids).forEach(p ->
                        labels.put(key("PLATFORM_PLAN", p.getId()), p.getName())));
        resolveType(idsByType, "TENANT_PLATFORM_PLAN", ids ->
                tenantPlatformPlanRepository.findAllById(ids).forEach(tp ->
                        labels.put(key("TENANT_PLATFORM_PLAN", tp.getId()),
                                tp.getPlan().getName() + " · " + tp.getTenant().getName())));
        resolveType(idsByType, "CUSTOMER_PRODUCT", ids ->
                customerProductRepository.findAllById(ids).forEach(cp ->
                        labels.put(key("CUSTOMER_PRODUCT", cp.getId()),
                                cp.getCustomer().getName() + " · " + cp.getProduct().getName())));
        return labels;
    }

    public static String key(String resourceType, Long resourceId) {
        return resourceType + ":" + resourceId;
    }

    private void resolveType(Map<String, Set<Long>> idsByType, String type, Consumer<Set<Long>> resolver) {
        Set<Long> ids = idsByType.get(type);
        if (ids != null && !ids.isEmpty()) resolver.accept(ids);
    }
}
