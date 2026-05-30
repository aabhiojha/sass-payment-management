package np.com.abhishekojha.coremonolith.modules.customer.repository;

import np.com.abhishekojha.coremonolith.common.enums.CustomerStatus;
import np.com.abhishekojha.coremonolith.modules.customer.model.CustomerEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {

    Page<CustomerEntity> findAllByTenantIdAndDeletedAtIsNull(Long tenantId, Pageable pageable);

    Page<CustomerEntity> findAllByTenantIdAndStatus(Long tenantId, CustomerStatus status, Pageable pageable);

    @Query("""
            SELECT c FROM CustomerEntity c
            WHERE c.tenant.id = :tenantId AND c.deletedAt IS NULL
            AND (:search IS NULL
                 OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
                 OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<CustomerEntity> searchByTenantId(@Param("tenantId") Long tenantId, @Param("search") String search, Pageable pageable);

    @Query("""
            SELECT c FROM CustomerEntity c
            WHERE c.tenant.id = :tenantId AND c.status = :status
            AND (:search IS NULL
                 OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
                 OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<CustomerEntity> searchByTenantIdAndStatus(@Param("tenantId") Long tenantId, @Param("status") CustomerStatus status, @Param("search") String search, Pageable pageable);

    Optional<CustomerEntity> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);

    boolean existsByTenantIdAndEmailAndDeletedAtIsNull(Long tenantId, String email);

    long countByTenantIdAndDeletedAtIsNull(Long tenantId);
}
