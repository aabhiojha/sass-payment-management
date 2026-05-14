package np.com.abhishekojha.coremonolith.modules.auth.repository;

import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmailAndDeletedAtIsNull(String email);

    boolean existsByEmail(String email);

    Page<UserEntity> findAllByTenantIdAndDeletedAtIsNull(Long tenantId, Pageable pageable);

    Optional<UserEntity> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
}
