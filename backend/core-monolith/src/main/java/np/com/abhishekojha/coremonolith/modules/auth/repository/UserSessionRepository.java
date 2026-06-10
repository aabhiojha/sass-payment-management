package np.com.abhishekojha.coremonolith.modules.auth.repository;

import np.com.abhishekojha.coremonolith.modules.auth.model.UserSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSessionEntity, Long> {

    Optional<UserSessionEntity> findByRefreshTokenHash(String hash);

    @Modifying
    @Query("DELETE FROM UserSessionEntity s WHERE s.expiresAt < :now AND s.revokedAt IS NOT NULL")
    int deleteExpiredSessions(@Param("now") Instant now);

    @Modifying
    @Query("UPDATE UserSessionEntity s SET s.revokedAt = :now WHERE s.user.id = :userId AND s.revokedAt IS NULL")
    int revokeAllSessionsByUserId(@Param("userId") Long userId, @Param("now") Instant now);
}
