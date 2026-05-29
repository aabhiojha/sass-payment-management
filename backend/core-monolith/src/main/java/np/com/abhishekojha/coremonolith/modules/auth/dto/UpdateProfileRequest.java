package np.com.abhishekojha.coremonolith.modules.auth.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 100)
        String fullName
) {}
