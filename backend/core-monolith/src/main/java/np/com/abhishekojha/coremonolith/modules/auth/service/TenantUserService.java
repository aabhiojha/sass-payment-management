package np.com.abhishekojha.coremonolith.modules.auth.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.common.enums.UserStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.auth.dto.UpdateUserRoleRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.UserResponse;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
@Transactional
@RequiredArgsConstructor
public class TenantUserService {

    private final UserRepository userRepository;
    private final TenantAccessGuard guard;

    public Page<UserResponse> listUsers(Long tenantId, Pageable pageable) {
        guard.requireTenantAccess(tenantId);
        return userRepository.findAllByTenantIdAndDeletedAtIsNull(tenantId, pageable)
                .map(UserResponse::from);
    }

    public UserResponse getUser(Long tenantId, Long userId) {
        guard.requireTenantAccess(tenantId);
        return UserResponse.from(findUser(tenantId, userId));
    }

    public UserResponse updateRole(Long tenantId, Long userId, UpdateUserRoleRequest req) {
        guard.requireTenantAccess(tenantId);
        if (req.role() == UserRole.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }
        UserEntity user = findUser(tenantId, userId);
        user.setRole(req.role());
        return UserResponse.from(user);
    }

    public UserResponse disableUser(Long tenantId, Long userId) {
        guard.requireTenantAccess(tenantId);
        UserEntity user = findUser(tenantId, userId);
        user.setStatus(UserStatus.DISABLED);
        return UserResponse.from(user);
    }

    public void deleteUser(Long tenantId, Long userId) {
        guard.requireTenantAccess(tenantId);
        UserEntity user = findUser(tenantId, userId);
        user.setStatus(UserStatus.DELETED);
        user.setDeletedAt(Instant.now());
        user.setDeletedBy(guard.currentUser());
    }

    private UserEntity findUser(Long tenantId, Long userId) {
        return userRepository.findByIdAndTenantIdAndDeletedAtIsNull(userId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }
}
