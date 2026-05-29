ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS days_before_expiry INT,
    ADD COLUMN IF NOT EXISTS retry_count        INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_reminders_cp_days
    ON reminders (customer_product_id, days_before_expiry, status);
