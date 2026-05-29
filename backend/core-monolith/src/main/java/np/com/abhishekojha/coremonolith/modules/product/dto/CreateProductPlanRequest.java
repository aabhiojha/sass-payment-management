package np.com.abhishekojha.coremonolith.modules.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import np.com.abhishekojha.coremonolith.common.enums.BillingCadence;

import java.math.BigDecimal;

public record CreateProductPlanRequest(
        @NotBlank @Size(max = 200)
        String name,

        @NotNull @DecimalMin("0.00")
        BigDecimal price,

        @NotBlank @Size(min = 3, max = 3)
        String currency,

        @NotNull
        BillingCadence billingCadence
) {}
