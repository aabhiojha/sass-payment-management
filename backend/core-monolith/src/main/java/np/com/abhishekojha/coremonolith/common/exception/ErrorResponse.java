package np.com.abhishekojha.coremonolith.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.slf4j.MDC;

import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        String code,
        String message,
        List<FieldError> details,
        String requestId,
        String path,
        Instant timestamp
) {
    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(code, message, null, MDC.get("requestId"), MDC.get("requestPath"), Instant.now());
    }

    public static ErrorResponse of(String code, String message, List<FieldError> details) {
        return new ErrorResponse(code, message, details, MDC.get("requestId"), MDC.get("requestPath"), Instant.now());
    }
}
