package np.com.abhishekojha.coremonolith.modules.customerproduct.repository;

import np.com.abhishekojha.coremonolith.common.enums.CustomerProductStatus;
import np.com.abhishekojha.coremonolith.modules.customerproduct.model.CustomerProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CustomerProductRepository extends JpaRepository<CustomerProductEntity, Long> {

    Page<CustomerProductEntity> findAllByTenantIdAndCustomerIdAndDeletedAtIsNull(Long tenantId, Long customerId, Pageable pageable);

    Page<CustomerProductEntity> findAllByTenantIdAndDeletedAtIsNull(Long tenantId, Pageable pageable);

    Page<CustomerProductEntity> findAllByTenantIdAndProductIdAndDeletedAtIsNull(Long tenantId, Long productId, Pageable pageable);

    Optional<CustomerProductEntity> findByIdAndTenantIdAndCustomerIdAndDeletedAtIsNull(Long id, Long tenantId, Long customerId);

    Optional<CustomerProductEntity> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);

    List<CustomerProductEntity> findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(
            Long tenantId, CustomerProductStatus status, Instant from, Instant to);

    long countByTenantIdAndStatusAndDeletedAtIsNull(Long tenantId, CustomerProductStatus status);

    @Query("""
            SELECT cp.product.currency, SUM(cp.product.price), COUNT(cp)
            FROM CustomerProductEntity cp
            WHERE cp.tenant.id = :tenantId
              AND cp.status = 'ACTIVE'
              AND cp.deletedAt IS NULL
            GROUP BY cp.product.currency
            """)
    List<Object[]> sumRevenueByTenantGroupedByCurrency(@Param("tenantId") Long tenantId);

    List<CustomerProductEntity> findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBefore(
            Long tenantId, CustomerProductStatus status, Instant before);

    List<CustomerProductEntity> findAllByProductIdAndStatusAndDeletedAtIsNull(
            Long productId, CustomerProductStatus status);

    List<CustomerProductEntity> findAllByProductIdAndStatusNotAndDeletedAtIsNull(
            Long productId, CustomerProductStatus excludedStatus);
}
