-- Change audit_logs.action from native PostgreSQL ENUM to VARCHAR
-- so we can store fully-qualified action names like "SUBSCRIPTION.PAUSED"
-- without needing an ALTER TYPE ADD VALUE migration every time.

ALTER TABLE audit_logs
    ALTER COLUMN action TYPE VARCHAR(100) USING action::text;

DROP TYPE IF EXISTS audit_action;
