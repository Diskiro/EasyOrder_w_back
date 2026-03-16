-- EasyOrder Local Database Schema
-- Run this script via: docker exec -i easyorder-db psql -U postgres -d postgres < init_db.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'waiter',
    full_name TEXT,
    last_sign_in_at TIMESTAMPTZ,
    password_hash TEXT,
    is_logged_in INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert an initial admin user for testing
INSERT INTO profiles (email, role, full_name, password_hash, is_logged_in) 
VALUES ('admin@easyorder.com', 'admin', 'Administrador Local', '$2b$10$iFzxTzsXVtdDZHNDjo1D6OyrDQ090561PKpMKrZ5aymXAkhBXhVFq', 0)
ON CONFLICT (email) DO NOTHING;

-- 2. Tables
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    number TEXT NOT NULL,
    capacity INT DEFAULT 4,
    status TEXT DEFAULT 'available',
    current_order_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default tables
INSERT INTO tables (number, capacity) VALUES ('M1', 2), ('M2', 4), ('M3', 4), ('M4', 6);

-- 3. Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, type, sort_order) VALUES ('Bebidas', 'drink', 1), ('Platos Fuertes', 'food', 2), ('Postres', 'food', 3);

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    image_url TEXT,
    stock_status TEXT DEFAULT 'in_stock',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO products (category_id, name, description, price, stock_status) VALUES 
(1, 'Refresco de Cola', 'Lata 355ml', 25.00, 'in_stock'),
(1, 'Agua Mineral', 'Botella 500ml', 20.00, 'in_stock'),
(2, 'Hamburguesa Clásica', 'Carne de res, queso, lechuga', 120.00, 'in_stock'),
(2, 'Pizza de Pepperoni', 'Personal 25cm', 150.00, 'in_stock'),
(3, 'Cheesecake', 'Rebanada de zarzamora', 65.00, 'in_stock');


-- 5. Orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    table_id INT REFERENCES tables(id),
    server_id UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'pending',
    total_amount NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    is_ready BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    table_id INT REFERENCES tables(id),
    customer_name TEXT NOT NULL,
    pax INT NOT NULL,
    reservation_time TIMESTAMPTZ NOT NULL,
    shift TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
