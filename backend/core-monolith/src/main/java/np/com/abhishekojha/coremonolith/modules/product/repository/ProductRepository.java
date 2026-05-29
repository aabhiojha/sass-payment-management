package np.com.abhishekojha.coremonolith.modules.product.repository;

import np.com.abhishekojha.coremonolith.common.enums.ProductStatus;
import np.com.abhishekojha.coremonolith.modules.product.model.ProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<ProductEntity, Long> {

    Page<ProductEntity> findAllByTenantIdAndDeletedAtIsNull(Long tenantId, Pageable pageable);

    Page<ProductEntity> findAllByTenantId(Long tenantId, Pageable pageable);

    Page<ProductEntity> findAllByTenantIdAndStatus(Long tenantId, ProductStatus status, Pageable pageable);

    Optional<ProductEntity> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);

    long countByTenantIdAndDeletedAtIsNull(Long tenantId);
}
