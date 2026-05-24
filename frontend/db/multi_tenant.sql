-- ════════════════════════════════════════
-- MULTI-TENANT MIGRATION
-- Run this in Railway PostgreSQL → Data → Query
-- ════════════════════════════════════════

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20) UNIQUE NOT NULL,  -- e.g. REST-001
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150),
  phone       VARCHAR(30),
  address     TEXT,
  logo_url    TEXT,
  is_active   BOOLEAN DEFAULT true,
  plan        VARCHAR(20) DEFAULT 'basic',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add tenant_id to all tables
ALTER TABLE branches    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE staff       ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE menu_items  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE tables      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE orders      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE inventory   ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE audit_logs  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- 3. Create default tenant for existing data
INSERT INTO tenants (code, name, email, is_active)
VALUES ('REST-001', 'Main Restaurant', 'admin@restaurant.com', true)
ON CONFLICT (code) DO NOTHING;

-- 4. Assign all existing data to tenant 1
UPDATE branches         SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE staff            SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE menu_items       SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE menu_categories  SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE tables           SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE orders           SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE order_items      SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE inventory        SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE audit_logs       SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_tenant       ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant      ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant  ON menu_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_tenant    ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tables_tenant      ON tables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant   ON inventory(tenant_id);
