package np.com.abhishekojha.coremonolith.modules.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.auth.dto.AcceptInviteRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.AuthResponse;
import np.com.abhishekojha.coremonolith.modules.auth.dto.ForgotPasswordRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.InviteTokenValidationResponse;
import np.com.abhishekojha.coremonolith.modules.auth.dto.LoginRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.RefreshTokenRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.ResetPasswordRequest;
import np.com.abhishekojha.coremonolith.modules.auth.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Login, token refresh, logout, and password reset")
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

    @Operation(summary = "Validate invitation token", description = "Check whether an invitation token is valid before the user sets a password. Returns invitation metadata on success.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token is valid and pending"),
            @ApiResponse(responseCode = "400", description = "Token is expired, already accepted, or revoked"),
            @ApiResponse(responseCode = "404", description = "Token not found")
    })
    @GetMapping("/invite/validate")
    public ResponseEntity<InviteTokenValidationResponse> validateInviteToken(@RequestParam String token) {
        return ResponseEntity.ok(authService.validateInviteToken(token));
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

    @Operation(summary = "Forgot password", description = "Send a password reset link to the user's email")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Reset link sent if email exists"),
            @ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Reset password", description = "Reset password using a reset token")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password reset successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid, expired, or already-used token")
    })
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.ok().build();
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
