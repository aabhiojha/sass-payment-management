package np.com.abhishekojha.coremonolith.modules.tenant.repository;

import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenantRepository extends JpaRepository<TenantEntity, Long> {

    boolean existsBySlug(String slug);

    Page<TenantEntity> findAllByDeletedAtIsNull(Pageable pageable);

    Page<TenantEntity> findAllByStatusAndDeletedAtIsNull(TenantStatus status, Pageable pageable);

    Optional<TenantEntity> findByIdAndDeletedAtIsNull(Long id);

    List<TenantEntity> findAllByStatusAndDeletedAtIsNull(TenantStatus status);
}
