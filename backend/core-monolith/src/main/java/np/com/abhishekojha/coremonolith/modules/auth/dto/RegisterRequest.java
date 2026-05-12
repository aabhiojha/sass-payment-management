package np.com.abhishekojha.coremonolith.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank
        String tenantName,

        @NotBlank
        @Pattern(regexp = "^[a-z0-9-]+$", message = "Slug must be lowercase alphanumeric with hyphens")
        String tenantSlug,

        @NotBlank @Email
        String companyEmail,

        @NotBlank
        String timezone,

        @NotBlank @Email
        String email,

        @NotBlank @Size(min = 8)
        String password
) {}
