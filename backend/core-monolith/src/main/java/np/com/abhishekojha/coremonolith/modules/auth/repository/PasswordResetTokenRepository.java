package np.com.abhishekojha.coremonolith.modules.auth.repository;

import np.com.abhishekojha.coremonolith.modules.auth.model.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {

    Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);

    void deleteAllByUserId(Long userId);
}
