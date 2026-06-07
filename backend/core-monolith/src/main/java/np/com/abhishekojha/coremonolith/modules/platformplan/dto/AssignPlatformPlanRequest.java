package np.com.abhishekojha.coremonolith.modules.platformplan.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;

public record AssignPlatformPlanRequest(

        @NotNull
        Long planId,

        BigDecimal customPrice,

        Instant startDate,

        Instant endDate
) {}
