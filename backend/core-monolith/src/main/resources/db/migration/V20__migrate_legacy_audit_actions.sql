-- Migrate legacy audit_action values to the new fully-qualified dot notation.
-- This handles the case where V19 was applied but existing rows still have
-- old enum text values like 'CREATE', 'UPDATE', etc.

UPDATE audit_logs SET action = 'USER.LOGIN'         WHERE action = 'LOGIN';
UPDATE audit_logs SET action = 'USER.LOGOUT'        WHERE action = 'LOGOUT';
UPDATE audit_logs SET action = 'USER.LOGIN_FAILED'  WHERE action = 'LOGIN_FAILED';

-- CREATE actions — mapped by resource_type
UPDATE audit_logs SET action = 'CUSTOMER.CREATED'       WHERE action = 'CREATE' AND resource_type = 'CUSTOMER';
UPDATE audit_logs SET action = 'PRODUCT.CREATED'         WHERE action = 'CREATE' AND resource_type = 'PRODUCT';
UPDATE audit_logs SET action = 'SUBSCRIPTION.CREATED'    WHERE action = 'CREATE' AND resource_type = 'CUSTOMER_PRODUCT';
UPDATE audit_logs SET action = 'TENANT.CREATED'          WHERE action = 'CREATE' AND resource_type = 'TENANT';
UPDATE audit_logs SET action = 'USER.CREATED'            WHERE action = 'CREATE' AND resource_type = 'USER';
UPDATE audit_logs SET action = 'INVITATION.CREATED'      WHERE action = 'CREATE' AND resource_type = 'INVITATION';
UPDATE audit_logs SET action = 'PLATFORM_PLAN.CREATED'   WHERE action = 'CREATE' AND resource_type = 'PLATFORM_PLAN';
UPDATE audit_logs SET action = 'TENANT_PLAN.ASSIGNED'    WHERE action = 'CREATE' AND resource_type = 'TENANT_PLATFORM_PLAN';

-- UPDATE actions
UPDATE audit_logs SET action = 'CUSTOMER.UPDATED'        WHERE action = 'UPDATE' AND resource_type = 'CUSTOMER';
UPDATE audit_logs SET action = 'PRODUCT.UPDATED'         WHERE action = 'UPDATE' AND resource_type = 'PRODUCT';
UPDATE audit_logs SET action = 'SUBSCRIPTION.UPDATED'    WHERE action = 'UPDATE' AND resource_type = 'CUSTOMER_PRODUCT';
UPDATE audit_logs SET action = 'TENANT.UPDATED'          WHERE action = 'UPDATE' AND resource_type = 'TENANT';
UPDATE audit_logs SET action = 'USER.ROLE_CHANGED'       WHERE action = 'UPDATE' AND resource_type = 'USER';
UPDATE audit_logs SET action = 'PLATFORM_PLAN.UPDATED'   WHERE action = 'UPDATE' AND resource_type = 'PLATFORM_PLAN';

-- DELETE actions
UPDATE audit_logs SET action = 'CUSTOMER.DELETED'        WHERE action = 'DELETE' AND resource_type = 'CUSTOMER';
UPDATE audit_logs SET action = 'PRODUCT.DELETED'         WHERE action = 'DELETE' AND resource_type = 'PRODUCT';
UPDATE audit_logs SET action = 'SUBSCRIPTION.DELETED'    WHERE action = 'DELETE' AND resource_type = 'CUSTOMER_PRODUCT';
UPDATE audit_logs SET action = 'USER.DELETED'            WHERE action = 'DELETE' AND resource_type = 'USER';

-- STATUS_CHANGE actions — use old/new value JSON to determine specific action
UPDATE audit_logs SET action = 'SUBSCRIPTION.ACTIVATED'   WHERE action = 'STATUS_CHANGE' AND resource_type = 'CUSTOMER_PRODUCT' AND new_value::text LIKE '%"status"%ACTIVE%';
UPDATE audit_logs SET action = 'SUBSCRIPTION.PAUSED'      WHERE action = 'STATUS_CHANGE' AND resource_type = 'CUSTOMER_PRODUCT' AND new_value::text LIKE '%"status"%PAUSED%';
UPDATE audit_logs SET action = 'SUBSCRIPTION.CANCELLED'   WHERE action = 'STATUS_CHANGE' AND resource_type = 'CUSTOMER_PRODUCT' AND new_value::text LIKE '%"status"%CANCELLED%';
UPDATE audit_logs SET action = 'SUBSCRIPTION.AUTO_CANCELLED' WHERE action = 'STATUS_CHANGE' AND resource_type = 'CUSTOMER_PRODUCT' AND (old_value::text LIKE '%expired%' OR new_value::text LIKE '%expired%');
UPDATE audit_logs SET action = 'TENANT.SUSPENDED'         WHERE action = 'STATUS_CHANGE' AND resource_type = 'TENANT' AND new_value::text LIKE '%SUSPENDED%';
UPDATE audit_logs SET action = 'TENANT.REACTIVATED'       WHERE action = 'STATUS_CHANGE' AND resource_type = 'TENANT' AND new_value::text LIKE '%"status"%ACTIVE%';
UPDATE audit_logs SET action = 'TENANT.ARCHIVED'          WHERE action = 'STATUS_CHANGE' AND resource_type = 'TENANT' AND new_value::text LIKE '%ARCHIVED%';
UPDATE audit_logs SET action = 'USER.DISABLED'            WHERE action = 'STATUS_CHANGE' AND resource_type = 'USER';
UPDATE audit_logs SET action = 'INVITATION.REVOKED'       WHERE action = 'STATUS_CHANGE' AND resource_type = 'INVITATION';
UPDATE audit_logs SET action = 'PLATFORM_PLAN.ARCHIVED'   WHERE action = 'STATUS_CHANGE' AND resource_type = 'PLATFORM_PLAN';
