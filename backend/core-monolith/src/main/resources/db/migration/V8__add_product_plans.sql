CREATE TABLE product_plans
(
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT         NOT NULL REFERENCES tenants (id),
    product_id      BIGINT         NOT NULL REFERENCES products (id),
    name            VARCHAR(200)   NOT NULL,
    price           NUMERIC(19, 4) NOT NULL,
    currency        VARCHAR(3)     NOT NULL DEFAULT 'USD',
    billing_cadence billing_cadence NOT NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_plans_product ON product_plans (product_id);
CREATE INDEX idx_product_plans_tenant  ON product_plans (tenant_id);

ALTER TABLE customer_products
    ADD COLUMN IF NOT EXISTS product_plan_id BIGINT REFERENCES product_plans (id),
    ADD COLUMN IF NOT EXISTS custom_price    NUMERIC(19, 4);
