ALTER TABLE customer_products
    ALTER COLUMN price    DROP NOT NULL,
    ALTER COLUMN currency DROP NOT NULL;
