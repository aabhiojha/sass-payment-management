package np.com.abhishekojha.coremonolith.modules.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.auth.dto.UpdateProfileRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.UserResponse;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@Tag(name = "Identity", description = "Current user profile")
@SecurityRequirement(name = "bearerAuth")
public class MeController {

    private final TenantAccessGuard guard;
    private final UserRepository userRepository;

    @Operation(summary = "Get own profile")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping
    public ResponseEntity<UserResponse> me() {
        return ResponseEntity.ok(UserResponse.from(guard.currentUser()));
    }

    @Operation(summary = "Update own profile", description = "Currently supports updating full name only")
    @ApiResponse(responseCode = "200", description = "Profile updated")
    @PatchMapping
    @Transactional
    public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest req) {
        UserEntity user = guard.currentUser();
        user.setFullName(req.fullName());
        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.from(user));
    }
}
