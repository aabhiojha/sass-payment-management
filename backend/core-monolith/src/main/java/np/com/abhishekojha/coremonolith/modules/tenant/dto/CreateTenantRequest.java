package np.com.abhishekojha.coremonolith.modules.tenant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTenantRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @NotBlank
        String companyEmail,

        @NotBlank
        @Size(max = 100)
        String timezone
) {}
