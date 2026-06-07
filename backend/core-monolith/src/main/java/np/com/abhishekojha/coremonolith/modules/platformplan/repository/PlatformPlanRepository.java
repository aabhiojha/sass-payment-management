package np.com.abhishekojha.coremonolith.modules.platformplan.repository;

import np.com.abhishekojha.coremonolith.common.enums.PlatformPlanStatus;
import np.com.abhishekojha.coremonolith.modules.platformplan.model.PlatformPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlatformPlanRepository extends JpaRepository<PlatformPlanEntity, Long> {

    List<PlatformPlanEntity> findAllByStatus(PlatformPlanStatus status);

    Optional<PlatformPlanEntity> findByIdAndStatus(Long id, PlatformPlanStatus status);
}
