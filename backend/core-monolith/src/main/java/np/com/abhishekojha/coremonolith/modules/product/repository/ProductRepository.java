package np.com.abhishekojha.coremonolith.modules.product.repository;

import np.com.abhishekojha.coremonolith.common.enums.ProductStatus;
import np.com.abhishekojha.coremonolith.modules.product.model.ProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<ProductEntity, Long> {

    Page<ProductEntity> findAllByTenantIdAndDeletedAtIsNull(Long tenantId, Pageable pageable);

    Page<ProductEntity> findAllByTenantId(Long tenantId, Pageable pageable);

    Page<ProductEntity> findAllByTenantIdAndStatus(Long tenantId, ProductStatus status, Pageable pageable);

    @Query("""
            SELECT p FROM ProductEntity p
            WHERE p.tenant.id = :tenantId AND p.deletedAt IS NULL
            AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<ProductEntity> searchByTenantId(@Param("tenantId") Long tenantId, @Param("search") String search, Pageable pageable);

    @Query("""
            SELECT p FROM ProductEntity p
            WHERE p.tenant.id = :tenantId
            AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<ProductEntity> searchAllByTenantId(@Param("tenantId") Long tenantId, @Param("search") String search, Pageable pageable);

    @Query("""
            SELECT p FROM ProductEntity p
            WHERE p.tenant.id = :tenantId AND p.status = :status
            AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<ProductEntity> searchByTenantIdAndStatus(@Param("tenantId") Long tenantId, @Param("status") ProductStatus status, @Param("search") String search, Pageable pageable);

    Optional<ProductEntity> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);

    long countByTenantIdAndDeletedAtIsNull(Long tenantId);
}
