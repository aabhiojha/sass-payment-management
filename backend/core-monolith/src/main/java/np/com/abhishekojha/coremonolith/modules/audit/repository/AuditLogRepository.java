package np.com.abhishekojha.coremonolith.modules.audit.repository;

import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.modules.audit.model.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {

    @Query("""
            SELECT a FROM AuditLogEntity a JOIN FETCH a.actor
            WHERE (:actorId IS NULL OR a.actor.id = :actorId)
              AND (:#{#actions.isEmpty()} = true OR CAST(a.action AS string) IN :actions)
              AND (:#{#resourceTypes.isEmpty()} = true OR a.resourceType IN :resourceTypes)
              AND (:resourceId IS NULL OR a.resourceId = :resourceId)
              AND (:actorEmail IS NULL OR LOWER(a.actor.email) LIKE LOWER(CONCAT('%', :actorEmail, '%')))
            ORDER BY a.createdAt DESC
            """)
    Page<AuditLogEntity> findFiltered(
            @Param("actorId") Long actorId,
            @Param("actions") List<String> actions,
            @Param("resourceTypes") List<String> resourceTypes,
            @Param("resourceId") Long resourceId,
            @Param("actorEmail") String actorEmail,
            Pageable pageable
    );

    @Query("""
            SELECT a FROM AuditLogEntity a JOIN FETCH a.actor
            WHERE a.actor.tenant.id = :tenantId
            ORDER BY a.createdAt DESC
            """)
    List<AuditLogEntity> findTop10ByTenantId(@Param("tenantId") Long tenantId, Pageable pageable);
}
