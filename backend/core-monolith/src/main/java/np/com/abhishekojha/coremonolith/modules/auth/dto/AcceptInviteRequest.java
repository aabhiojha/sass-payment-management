package np.com.abhishekojha.coremonolith.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AcceptInviteRequest(

        @NotBlank
        String token,

        @NotBlank
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password
) {}
