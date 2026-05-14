package np.com.abhishekojha.coremonolith.modules.customer.repository;

import np.com.abhishekojha.coremonolith.modules.customer.model.CustomerEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {

    Page<CustomerEntity> findAllByTenantIdAndDeletedAtIsNull(Long tenantId, Pageable pageable);

    Optional<CustomerEntity> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);

    boolean existsByTenantIdAndEmailAndDeletedAtIsNull(Long tenantId, String email);
}
