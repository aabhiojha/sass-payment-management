package np.com.abhishekojha.coremonolith.modules.reminder.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.ReminderStatus;
import np.com.abhishekojha.coremonolith.modules.reminder.dto.ReminderResponse;
import np.com.abhishekojha.coremonolith.modules.reminder.dto.UpcomingReminderResponse;
import np.com.abhishekojha.coremonolith.modules.reminder.service.ReminderService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/reminders")
@RequiredArgsConstructor
@Tag(name = "Reminders", description = "Payment reminder history and batch trigger")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
public class ReminderController {

    private final ReminderService reminderService;

    @Operation(summary = "List reminder history")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping
    public ResponseEntity<Page<ReminderResponse>> list(
            @PathVariable Long tenantId,
            @RequestParam(required = false) ReminderStatus status,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(reminderService.list(tenantId, status, pageable));
    }

    @Operation(summary = "List upcoming reminders",
            description = "Reminders due to fire within the next N days that haven't been sent or skipped yet")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping("/upcoming")
    public ResponseEntity<List<UpcomingReminderResponse>> listUpcoming(
            @PathVariable Long tenantId,
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(reminderService.listUpcoming(tenantId, days));
    }

    @Operation(summary = "List reminders for a specific subscription")
    @GetMapping("/by-customer-product/{customerProductId}")
    public ResponseEntity<List<ReminderResponse>> listByCustomerProduct(
            @PathVariable Long tenantId,
            @PathVariable Long customerProductId) {
        return ResponseEntity.ok(reminderService.listByCustomerProduct(tenantId, customerProductId));
    }

    @Operation(summary = "Get reminder record")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    @GetMapping("/{reminderId}")
    public ResponseEntity<ReminderResponse> get(
            @PathVariable Long tenantId,
            @PathVariable Long reminderId) {
        return ResponseEntity.ok(reminderService.get(tenantId, reminderId));
    }

    @Operation(summary = "Manually trigger reminder batch",
            description = "Sends payment reminders for all active plans with ends_at within the next 7 days")
    @ApiResponse(responseCode = "200", description = "Reminders dispatched")
    @PostMapping("/trigger")
    public ResponseEntity<List<ReminderResponse>> trigger(@PathVariable Long tenantId) {
        return ResponseEntity.ok(reminderService.trigger(tenantId));
    }
}
