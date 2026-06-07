ALTER TABLE platform_plans
    ADD COLUMN description    TEXT,
    ADD COLUMN currency       VARCHAR(3)       NOT NULL DEFAULT 'USD',
    ADD COLUMN billing_cadence billing_cadence NOT NULL DEFAULT 'MONTHLY',
    ADD COLUMN status         VARCHAR(20)      NOT NULL DEFAULT 'ACTIVE';
