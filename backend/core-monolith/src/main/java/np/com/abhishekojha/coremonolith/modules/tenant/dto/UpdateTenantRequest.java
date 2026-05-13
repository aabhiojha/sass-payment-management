package np.com.abhishekojha.coremonolith.modules.tenant.dto;

import jakarta.validation.constraints.Size;

public record UpdateTenantRequest(

        @Size(max = 100)
        String name,

        String companyEmail,

        @Size(max = 100)
        String timezone
) {}
