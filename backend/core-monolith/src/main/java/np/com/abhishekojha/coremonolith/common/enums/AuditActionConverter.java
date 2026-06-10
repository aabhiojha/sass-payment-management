package np.com.abhishekojha.coremonolith.common.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class AuditActionConverter implements AttributeConverter<AuditAction, String> {

    @Override
    public String convertToDatabaseColumn(AuditAction action) {
        return action == null ? null : action.getValue();
    }

    @Override
    public AuditAction convertToEntityAttribute(String dbData) {
        return dbData == null ? null : AuditAction.fromValue(dbData);
    }
}
