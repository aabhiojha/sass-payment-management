package np.com.abhishekojha.coremonolith.modules.audit.repository;

import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.modules.audit.model.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {

    @Query("""
            SELECT a FROM AuditLogEntity a
            WHERE (:actorId IS NULL OR a.actor.id = :actorId)
              AND (:action IS NULL OR a.action = :action)
              AND (:resourceType IS NULL OR a.resourceType = :resourceType)
              AND (:resourceId IS NULL OR a.resourceId = :resourceId)
            ORDER BY a.createdAt DESC
            """)
    Page<AuditLogEntity> findFiltered(
            @Param("actorId") Long actorId,
            @Param("action") AuditAction action,
            @Param("resourceType") String resourceType,
            @Param("resourceId") Long resourceId,
            Pageable pageable
    );
}
