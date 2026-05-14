package np.com.abhishekojha.coremonolith.modules.customer.dto;

import np.com.abhishekojha.coremonolith.modules.customer.model.CustomerEntity;

import java.time.Instant;

public record CustomerResponse(
        Long id,
        Long tenantId,
        String name,
        String email,
        String phone,
        String address,
        String notes,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static CustomerResponse from(CustomerEntity c) {
        return new CustomerResponse(
                c.getId(),
                c.getTenant().getId(),
                c.getName(),
                c.getEmail(),
                c.getPhone(),
                c.getAddress(),
                c.getNotes(),
                c.getStatus().name(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
