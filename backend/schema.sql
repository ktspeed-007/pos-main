-- Create database and user
CREATE DATABASE posdb;
CREATE USER posuser WITH PASSWORD 'pospassword';
GRANT ALL PRIVILEGES ON DATABASE posdb TO posuser;

-- Connect to posdb
\c posdb;

-- Create tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    productCode VARCHAR(50),
    lotCode VARCHAR(50),
    barcode VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    category VARCHAR(100),
    sellerId VARCHAR(50),
    seller VARCHAR(100),
    warehouseId VARCHAR(50),
    warehouseName VARCHAR(100),
    storageLocationId VARCHAR(50),
    storageLocationName VARCHAR(100),
    productionDate DATE,
    expiryDate DATE,
    paymentMethods JSONB,
    creditDays INTEGER,
    dueDate DATE,
    active BOOLEAN DEFAULT true,
    minStock INTEGER DEFAULT 0,
    maxStock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sellers (
    id SERIAL PRIMARY KEY,
    shopCode VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    taxId VARCHAR(20),
    bankAccount VARCHAR(20),
    bankName VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    warehouseCode VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE storage_locations (
    id SERIAL PRIMARY KEY,
    storageCode VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
    items JSONB NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sellerId VARCHAR(50),
    sellerName VARCHAR(200),
    createdBy VARCHAR(100),
    expectedDeliveryDate DATE,
    notes TEXT,
    paymentMethod VARCHAR(20),
    creditDays INTEGER,
    dueDate DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sales (
    id VARCHAR(50) PRIMARY KEY,
    items JSONB NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    paymentMethod VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    receivedAmount DECIMAL(10,2) NOT NULL,
    changeAmount DECIMAL(10,2) NOT NULL,
    canceled BOOLEAN DEFAULT false
);

CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shop_info (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    logo TEXT,
    address TEXT,
    phone VARCHAR(20),
    taxId VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Grant permissions to posuser
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO posuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO posuser;

-- Insert initial data
INSERT INTO users (username, name, password, role, active) VALUES
('admin', 'ผู้ดูแลระบบ', 'admin123', 'admin', true),
('staff', 'พนักงานขาย', 'staff123', 'staff', true);

INSERT INTO shop_info (name, logo, address, phone, taxId) VALUES
('Grocery Guru', '', '', '', ''); 