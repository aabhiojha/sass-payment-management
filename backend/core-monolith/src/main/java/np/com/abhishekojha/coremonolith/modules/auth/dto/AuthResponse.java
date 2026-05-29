package np.com.abhishekojha.coremonolith.modules.auth.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String email,
        String role,
        String fullName
) {}
