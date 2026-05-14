package np.com.abhishekojha.coremonolith.modules.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.auth.dto.AcceptInviteRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.AuthResponse;
import np.com.abhishekojha.coremonolith.modules.auth.dto.LoginRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.RefreshTokenRequest;
import np.com.abhishekojha.coremonolith.modules.auth.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Login, token refresh, and logout")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Login", description = "Authenticate with email and password; returns access + refresh tokens")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated successfully"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @Operation(summary = "Refresh tokens", description = "Exchange a valid refresh token for a new token pair")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tokens refreshed"),
            @ApiResponse(responseCode = "401", description = "Refresh token invalid or expired")
    })
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return ResponseEntity.ok(authService.refresh(req.refreshToken()));
    }

    @Operation(summary = "Accept invitation", description = "Set a password and activate account using an invitation token; returns auth tokens")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Account created and logged in"),
            @ApiResponse(responseCode = "400", description = "Invalid, expired, or already-used token"),
            @ApiResponse(responseCode = "409", description = "Email already registered")
    })
    @PostMapping("/accept-invite")
    public ResponseEntity<AuthResponse> acceptInvite(@Valid @RequestBody AcceptInviteRequest req) {
        return ResponseEntity.ok(authService.acceptInvite(req));
    }

    @Operation(summary = "Logout", description = "Revoke the provided refresh token")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Logged out"),
            @ApiResponse(responseCode = "401", description = "Refresh token not found")
    })
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest req) {
        authService.logout(req.refreshToken());
        return ResponseEntity.noContent().build();
    }
}
