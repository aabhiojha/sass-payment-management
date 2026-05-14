package np.com.abhishekojha.coremonolith.modules.auth.dto;

import jakarta.validation.constraints.NotNull;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;

public record UpdateUserRoleRequest(
        @NotNull UserRole role
) {}
