-- ==============================================================================
-- Migración: Arquitectura Multi-Tenant y Control de Suscripciones
-- Descripción: Tablas de planes, restaurantes y vinculación de restaurant_id
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Catálogo de Planes de Suscripción (Feature Toggles)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(50) PRIMARY KEY, -- 'basico', 'pro', 'enterprise'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_tables INT DEFAULT 10,
    max_users INT DEFAULT 3,
    has_kitchen_display BOOLEAN DEFAULT FALSE,
    has_analytics BOOLEAN DEFAULT FALSE,
    has_reservations BOOLEAN DEFAULT FALSE,
    has_cash_register BOOLEAN DEFAULT FALSE,
    has_qr_ordering BOOLEAN DEFAULT TRUE,
    price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar planes predeterminados (Idempotente)
INSERT INTO subscription_plans (id, name, description, max_tables, max_users, has_kitchen_display, has_analytics, has_reservations, has_cash_register, has_qr_ordering, price_monthly)
VALUES 
    ('basico', 'Plan Básico', 'Ideal para cafeterías y negocios pequeños con comandas y QR', 10, 2, FALSE, FALSE, FALSE, FALSE, TRUE, 299.00),
    ('pro', 'Plan Profesional', 'Para restaurantes activos con pantalla de cocina, analíticas y caja', 30, 8, TRUE, TRUE, TRUE, TRUE, TRUE, 599.00),
    ('enterprise', 'Plan Empresarial', 'Mesas y usuarios ilimitados con todos los módulos avanzados', 999, 999, TRUE, TRUE, TRUE, TRUE, TRUE, 999.00)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    max_tables = EXCLUDED.max_tables,
    max_users = EXCLUDED.max_users,
    has_kitchen_display = EXCLUDED.has_kitchen_display,
    has_analytics = EXCLUDED.has_analytics,
    has_reservations = EXCLUDED.has_reservations,
    has_cash_register = EXCLUDED.has_cash_register,
    has_qr_ordering = EXCLUDED.has_qr_ordering,
    price_monthly = EXCLUDED.price_monthly;

-- 2. Tabla Principal de Restaurantes (Inquilinos / Tenants)
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'demo', 'restauranteuno'
    name VARCHAR(200) NOT NULL,
    plan_id VARCHAR(50) REFERENCES subscription_plans(id) DEFAULT 'basico',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'past_due')),
    subscription_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    logo_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#FBBF24',
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear restaurante demo predeterminado
INSERT INTO restaurants (slug, name, plan_id, status, subscription_expires_at, primary_color)
VALUES ('demo', 'Restaurante Demo', 'enterprise', 'active', NOW() + INTERVAL '1 year', '#FBBF24')
ON CONFLICT (slug) DO NOTHING;

-- 3. Vincular restaurant_id a las tablas operativas existentes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reservations') THEN
        ALTER TABLE reservations ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_register_sessions') THEN
        ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Migrar los datos existentes asociándolos al restaurante demo
DO $$
DECLARE
    default_restaurant_id UUID;
BEGIN
    SELECT id INTO default_restaurant_id FROM restaurants WHERE slug = 'demo' LIMIT 1;
    
    UPDATE profiles SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE tables SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE categories SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE products SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE orders SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reservations') THEN
        UPDATE reservations SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_register_sessions') THEN
        UPDATE cash_register_sessions SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    END IF;
END $$;

-- 5. Índices para rendimiento óptimo en consultas multi-tenant
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
