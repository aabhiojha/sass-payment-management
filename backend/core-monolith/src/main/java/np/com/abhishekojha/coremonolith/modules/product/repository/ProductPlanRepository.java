package np.com.abhishekojha.coremonolith.modules.product.repository;

import np.com.abhishekojha.coremonolith.modules.product.model.ProductPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductPlanRepository extends JpaRepository<ProductPlanEntity, Long> {

    List<ProductPlanEntity> findAllByProductIdAndTenantId(Long productId, Long tenantId);

    Optional<ProductPlanEntity> findByIdAndProductIdAndTenantId(Long id, Long productId, Long tenantId);
}
