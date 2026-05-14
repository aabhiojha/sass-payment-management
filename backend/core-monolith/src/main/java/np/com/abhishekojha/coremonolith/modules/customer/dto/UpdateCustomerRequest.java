package np.com.abhishekojha.coremonolith.modules.customer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateCustomerRequest(

        @Size(max = 200)
        String name,

        @Email
        String email,

        @Size(max = 50)
        String phone,

        String address,

        String notes
) {}
