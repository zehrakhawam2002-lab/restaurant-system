-- RestaurantOS Database Schema
 
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 
CREATE TABLE IF NOT EXISTS branches (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  address    TEXT,
  phone      VARCHAR(20),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS staff (
  id                  SERIAL PRIMARY KEY,
  branch_id           INTEGER REFERENCES branches(id),
  name                VARCHAR(100) NOT NULL,
  email               VARCHAR(150) UNIQUE NOT NULL,
  phone               VARCHAR(20),
  password_hash       TEXT NOT NULL,
  role                VARCHAR(20) NOT NULL CHECK (role IN ('superadmin','admin','manager','cashier','kitchen','waiter')),
  totp_secret         TEXT,
  totp_secret_pending TEXT,
  is_active           BOOLEAN DEFAULT true,
  last_seen           TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  ip         VARCHAR(50),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS failed_logins (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(150),
  ip           VARCHAR(50),
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS tables (
  id        SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES branches(id) NOT NULL,
  number    VARCHAR(10) NOT NULL,
  capacity  SMALLINT DEFAULT 4,
  status    VARCHAR(20) DEFAULT 'free' CHECK (status IN ('free','occupied','reserved','cleaning')),
  UNIQUE(branch_id, number)
);
 
CREATE TABLE IF NOT EXISTS menu_categories (
  id         SERIAL PRIMARY KEY,
  branch_id  INTEGER REFERENCES branches(id),
  name       VARCHAR(100) NOT NULL,
  sort_order SMALLINT DEFAULT 0
);
 
CREATE TABLE IF NOT EXISTS menu_items (
  id           SERIAL PRIMARY KEY,
  branch_id    INTEGER REFERENCES branches(id),
  category_id  INTEGER REFERENCES menu_categories(id),
  name         VARCHAR(150) NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url    TEXT,
  is_available BOOLEAN DEFAULT true,
  is_deleted   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  branch_id      INTEGER REFERENCES branches(id) NOT NULL,
  table_id       INTEGER REFERENCES tables(id),
  created_by     INTEGER REFERENCES staff(id),
  order_type     VARCHAR(20) NOT NULL CHECK (order_type IN ('dine_in','delivery','pickup')),
  status         VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','preparing','ready','delivered','cancelled')),
  total          NUMERIC(12,2) NOT NULL,
  customer_name  VARCHAR(100),
  customer_phone VARCHAR(20),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id),
  quantity     SMALLINT NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL,
  notes        TEXT
);
 
CREATE TABLE IF NOT EXISTS inventory (
  id            SERIAL PRIMARY KEY,
  branch_id     INTEGER REFERENCES branches(id) NOT NULL,
  name          VARCHAR(150) NOT NULL,
  unit          VARCHAR(20),
  quantity      NUMERIC(10,3) DEFAULT 0,
  min_quantity  NUMERIC(10,3) DEFAULT 0,
  cost_per_unit NUMERIC(10,2),
  supplier      VARCHAR(150),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES staff(id),
  user_name  VARCHAR(100),
  role       VARCHAR(20),
  action     VARCHAR(100) NOT NULL,
  entity     VARCHAR(50),
  entity_id  INTEGER,
  details    JSONB,
  ip         VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
 
-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_branch_status ON orders(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_id        ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at     ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user  ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_logins_email  ON failed_logins(email, attempted_at);
 
-- Seed data
INSERT INTO branches (name, address, phone) VALUES
  ('Main Branch', 'Baghdad - Karrada', '+964 770 111 1111'),
  ('Branch 2',    'Baghdad - Mansour', '+964 770 222 2222')
ON CONFLICT DO NOTHING;
 
INSERT INTO staff (branch_id, name, email, password_hash, role) VALUES
  (1, 'Admin', 'admin@restaurant.com', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'superadmin')
ON CONFLICT DO NOTHING;
 
INSERT INTO menu_categories (name, sort_order) VALUES
  ('Main Dishes', 1),
  ('Appetizers',  2),
  ('Drinks',      3),
  ('Desserts',    4)
ON CONFLICT DO NOTHING;
 
INSERT INTO menu_items (category_id, name, price) VALUES
  (1, 'Classic Burger',    12500),
  (1, 'Grilled Chicken',   22000),
  (1, 'Margherita Pizza',  18000),
  (2, 'Caesar Salad',       9000),
  (3, 'Fresh Juice',        6500),
  (3, 'Turkish Coffee',     4000),
  (4, 'Chocolate Cake',     8500)
ON CONFLICT DO NOTHING;