package np.com.abhishekojha.coremonolith.config;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
public class TenantAccessGuard {

    private final UserRepository userRepository;

    public UserEntity requireTenantAccess(Long tenantId) {
        UserEntity user = currentUser();
        if (user.getRole() == UserRole.SUPER_ADMIN) return user;
        if (user.getTenant() == null || !user.getTenant().getId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ACCESS_DENIED");
        }
        return user;
    }

    public UserEntity currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found"));
    }
}
