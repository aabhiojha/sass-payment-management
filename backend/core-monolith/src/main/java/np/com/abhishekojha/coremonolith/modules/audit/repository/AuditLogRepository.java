package np.com.abhishekojha.coremonolith.modules.audit.repository;

import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.modules.audit.model.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {

    @Query("""
            SELECT a FROM AuditLogEntity a JOIN FETCH a.actor actor LEFT JOIN FETCH actor.tenant
            WHERE a.actor.tenant.id = :tenantId
              AND a.action NOT IN :excludedActions
            ORDER BY a.createdAt DESC
            """)
    List<AuditLogEntity> findTop10ByTenantId(@Param("tenantId") Long tenantId,
                                             @Param("excludedActions") List<AuditAction> excludedActions,
                                             Pageable pageable);


    @Query("""
            SELECT a FROM AuditLogEntity a JOIN FETCH a.actor actor LEFT JOIN FETCH actor.tenant
            WHERE (:actorId IS NULL OR a.actor.id = :actorId)
              AND (:#{#actions.isEmpty()} = true OR a.action IN :actions)
              AND (:#{#resourceTypes.isEmpty()} = true OR a.resourceType IN :resourceTypes)
              AND (:resourceId IS NULL OR a.resourceId = :resourceId)
              AND (:actorEmail IS NULL OR a.actor.email LIKE CONCAT('%', CAST(:actorEmail AS string), '%'))
              AND a.createdAt >= COALESCE(:from, a.createdAt)
              AND a.createdAt <= COALESCE(:to, a.createdAt)
            ORDER BY a.createdAt DESC
            """)
    Page<AuditLogEntity> findFiltered(
            @Param("actorId") Long actorId,
            @Param("actions") List<AuditAction> actions,
            @Param("resourceTypes") List<String> resourceTypes,
            @Param("resourceId") Long resourceId,
            @Param("actorEmail") String actorEmail,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );

    @Query("""
            SELECT a FROM AuditLogEntity a JOIN FETCH a.actor actor LEFT JOIN FETCH actor.tenant
            WHERE a.actor.tenant.id = :tenantId
              AND (:actorId IS NULL OR a.actor.id = :actorId)
              AND (:#{#actions.isEmpty()} = true OR a.action IN :actions)
              AND (:#{#resourceTypes.isEmpty()} = true OR a.resourceType IN :resourceTypes)
              AND (:resourceId IS NULL OR a.resourceId = :resourceId)
              AND (:actorEmail IS NULL OR a.actor.email LIKE CONCAT('%', CAST(:actorEmail AS string), '%'))
              AND a.createdAt >= COALESCE(:from, a.createdAt)
              AND a.createdAt <= COALESCE(:to, a.createdAt)
            ORDER BY a.createdAt DESC
            """)
    Page<AuditLogEntity> findFilteredByTenant(
            @Param("tenantId") Long tenantId,
            @Param("actorId") Long actorId,
            @Param("actions") List<AuditAction> actions,
            @Param("resourceTypes") List<String> resourceTypes,
            @Param("resourceId") Long resourceId,
            @Param("actorEmail") String actorEmail,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );
}
