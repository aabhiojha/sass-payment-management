package np.com.abhishekojha.coremonolith.modules.invitation.repository;

import np.com.abhishekojha.coremonolith.common.enums.InvitationStatus;
import np.com.abhishekojha.coremonolith.modules.invitation.model.UserInvitationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InvitationRepository extends JpaRepository<UserInvitationEntity, Long> {

    boolean existsByTenantIdAndEmailAndStatus(Long tenantId, String email, InvitationStatus status);

    Optional<UserInvitationEntity> findByTokenHash(String tokenHash);
}
