package np.com.abhishekojha.coremonolith.modules.reminder.repository;

import np.com.abhishekojha.coremonolith.common.enums.ReminderStatus;
import np.com.abhishekojha.coremonolith.modules.reminder.model.ReminderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ReminderRepository extends JpaRepository<ReminderEntity, Long> {

    Page<ReminderEntity> findAllByTenantId(Long tenantId, Pageable pageable);

    Page<ReminderEntity> findAllByTenantIdAndStatus(Long tenantId, ReminderStatus status, Pageable pageable);

    Optional<ReminderEntity> findByIdAndTenantId(Long id, Long tenantId);

    long countByTenantIdAndStatusAndCreatedAtBetween(
            Long tenantId, ReminderStatus status, Instant from, Instant to);

    long countByStatus(ReminderStatus status);

    boolean existsByCustomerProductIdAndDaysBeforeExpiryAndStatusIn(
            Long customerProductId, Integer daysBeforeExpiry, List<ReminderStatus> statuses);

}
