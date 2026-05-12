package np.com.abhishekojha.coremonolith.common.exception;

public class TenantIsolationException extends RuntimeException {

    public TenantIsolationException(String message) {
        super(message);
    }
}
