package np.com.abhishekojha.coremonolith.modules.invitation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record InviteRequest(
        @NotBlank @Email String email
) {}
