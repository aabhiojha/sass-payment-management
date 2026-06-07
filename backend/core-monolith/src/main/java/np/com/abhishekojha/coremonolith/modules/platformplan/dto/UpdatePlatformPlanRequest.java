package np.com.abhishekojha.coremonolith.modules.platformplan.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import np.com.abhishekojha.coremonolith.common.enums.BillingCadence;

import java.math.BigDecimal;

public record UpdatePlatformPlanRequest(

        @Size(max = 100)
        String name,

        String description,

        @DecimalMin("0.00")
        BigDecimal price,

        @Size(min = 3, max = 3)
        String currency,

        BillingCadence billingCadence
) {}
