package np.com.abhishekojha.coremonolith.modules.platformplan.repository;

import np.com.abhishekojha.coremonolith.common.enums.PlatformPlanStatus;
import np.com.abhishekojha.coremonolith.modules.platformplan.model.TenantPlatformPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenantPlatformPlanRepository extends JpaRepository<TenantPlatformPlanEntity, Long> {

    Optional<TenantPlatformPlanEntity> findByTenantIdAndStatus(Long tenantId, PlatformPlanStatus status);

    List<TenantPlatformPlanEntity> findAllByTenantIdOrderByCreatedAtDesc(Long tenantId);
}
