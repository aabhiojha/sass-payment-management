package np.com.abhishekojha.coremonolith.modules.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.modules.audit.model.AuditLogEntity;
import np.com.abhishekojha.coremonolith.modules.audit.repository.AuditLogRepository;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public void log(AuditAction action, String resourceType, Long resourceId,
                    Object oldValue, Object newValue) {
        log(currentUser(), action, resourceType, resourceId, oldValue, newValue);
    }

    public void log(UserEntity actor, AuditAction action, String resourceType, Long resourceId,
                    Object oldValue, Object newValue) {
        try {
            AuditLogEntity entry = new AuditLogEntity();
            entry.setActor(actor);
            entry.setAction(action);
            entry.setResourceType(resourceType);
            entry.setResourceId(resourceId);
            entry.setOldValue(toJson(oldValue));
            entry.setNewValue(toJson(newValue));
            entry.setUserAgent(userAgent());
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write audit log [{} {}:{}]: {}", action, resourceType, resourceId, e.getMessage());
        }
    }

    private UserEntity currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found"));
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize audit value: {}", e.getMessage());
            return null;
        }
    }

    private String userAgent() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attrs != null ? attrs.getRequest().getHeader("User-Agent") : null;
        } catch (Exception e) {
            return null;
        }
    }
}
