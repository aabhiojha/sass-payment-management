package np.com.abhishekojha.coremonolith.modules.platformplan.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import np.com.abhishekojha.coremonolith.common.enums.BillingCadence;
import np.com.abhishekojha.coremonolith.common.enums.PlatformPlanStatus;
import np.com.abhishekojha.coremonolith.modules.audit.model.BaseAuditEntity;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "platform_plans")
public class PlatformPlanEntity extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal price;

    @Column(nullable = false, length = 3)
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "billing_cadence", nullable = false, columnDefinition = "billing_cadence")
    private BillingCadence billingCadence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlatformPlanStatus status = PlatformPlanStatus.ACTIVE;
}
