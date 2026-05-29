package np.com.abhishekojha.coremonolith.modules.customerproduct.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;

public record AssignProductRequest(

        @NotNull
        Long productId,

        Long planId,

        @DecimalMin("0.00")
        BigDecimal customPrice,

        Instant startsAt,

        Instant endsAt,

        String notes
) {}
