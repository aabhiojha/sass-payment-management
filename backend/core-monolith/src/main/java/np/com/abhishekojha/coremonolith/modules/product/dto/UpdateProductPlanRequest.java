package np.com.abhishekojha.coremonolith.modules.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import np.com.abhishekojha.coremonolith.common.enums.BillingCadence;

import java.math.BigDecimal;

public record UpdateProductPlanRequest(
        @Size(max = 200)
        String name,

        @DecimalMin("0.00")
        BigDecimal price,

        @Size(min = 3, max = 3)
        String currency,

        BillingCadence billingCadence
) {}
