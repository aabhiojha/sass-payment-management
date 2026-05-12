package np.com.abhishekojha.coremonolith.common.exception;

import java.util.List;

public record ErrorResponse(String code, String message, List<FieldError> details) {

    public ErrorResponse(String code, String message) {
        this(code, message, null);
    }
}
