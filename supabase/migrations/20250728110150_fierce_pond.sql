-- Database Restore Script - Clean and Restore
-- Run this script to properly restore your database

-- Step 1: Drop all existing tables in correct order (to avoid foreign key conflicts)
DROP TABLE IF EXISTS ip_entries CASCADE;
DROP TABLE IF EXISTS whitelist CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Drop any existing functions and triggers
DROP FUNCTION IF EXISTS update_modified_column() CASCADE;
DROP FUNCTION IF EXISTS set_ip_entry_expiration() CASCADE;
DROP FUNCTION IF EXISTS update_ip_entries_expiration() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_ip_entries() CASCADE;

-- Step 3: Drop any existing views
DROP VIEW IF EXISTS active_categories CASCADE;
DROP VIEW IF EXISTS active_users CASCADE;
DROP VIEW IF EXISTS ip_entries_with_categories CASCADE;
DROP VIEW IF EXISTS categories_with_expiration CASCADE;

-- Step 4: Now create the complete schema
-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'soc_admin', 'superadmin')),
    assigned_categories TEXT[],
    is_active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT false,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table with expiration support
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT 'bg-blue-500',
    icon VARCHAR(50) DEFAULT 'Shield',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Expiration fields
    expiration_hours INTEGER NULL CHECK (expiration_hours IS NULL OR expiration_hours > 0),
    auto_cleanup BOOLEAN DEFAULT false
);

-- Create ip_entries table with expiration support
CREATE TABLE ip_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'ip' CHECK (type IN ('ip', 'hostname', 'fqdn')),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    description TEXT,
    added_by VARCHAR(50) NOT NULL DEFAULT 'admin',
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'abuseipdb', 'virustotal', 'other')),
    source_category VARCHAR(50),
    reputation JSONB,
    vt_reputation JSONB,
    -- Expiration fields
    expires_at TIMESTAMP NULL,
    auto_remove BOOLEAN DEFAULT false
);

-- Create whitelist table
CREATE TABLE whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'ip' CHECK (type IN ('ip', 'hostname', 'fqdn')),
    description TEXT,
    added_by VARCHAR(50) NOT NULL DEFAULT 'admin',
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_ip_entries_category ON ip_entries(category_id);
CREATE INDEX idx_ip_entries_ip ON ip_entries(ip);
CREATE INDEX idx_ip_entries_source ON ip_entries(source);
CREATE INDEX idx_ip_entries_date ON ip_entries(date_added);
CREATE INDEX idx_ip_entries_expires_at ON ip_entries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_whitelist_ip ON whitelist(ip);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_expiration_hours ON categories(expiration_hours) WHERE expiration_hours IS NOT NULL;
CREATE INDEX idx_categories_auto_cleanup ON categories(auto_cleanup) WHERE auto_cleanup = true;

-- Insert default admin user
INSERT INTO users (username, email, password, role, created_by, is_active, must_change_password) VALUES 
('admin', 'admin@company.com', 'password', 'superadmin', 'system', true, false);

-- Insert additional demo users for testing
INSERT INTO users (username, email, password, role, assigned_categories, created_by, is_active, must_change_password) VALUES 
('soc_malware', 'soc.malware@company.com', 'password', 'soc_admin', ARRAY['11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'], 'admin', true, false),
('soc_phishing', 'soc.phishing@company.com', 'password', 'soc_admin', ARRAY['22222222-2222-2222-2222-222222222222'], 'admin', true, false),
('viewer', 'viewer@company.com', 'password', 'viewer', NULL, 'admin', true, false);

-- Insert default categories with expiration settings
INSERT INTO categories (id, name, label, description, color, icon, is_default, created_by, expiration_hours, auto_cleanup) VALUES 
('11111111-1111-1111-1111-111111111111', 'malware', 'Malware IPs', 'Known malware command & control servers', 'bg-red-500', 'Bug', true, 'system', 168, true),
('22222222-2222-2222-2222-222222222222', 'phishing', 'Phishing IPs', 'Phishing campaign infrastructure', 'bg-orange-500', 'Mail', true, 'system', 72, true),
('33333333-3333-3333-3333-333333333333', 'c2', 'C2 IPs', 'Command & control servers', 'bg-purple-500', 'Server', true, 'system', 336, true),
('44444444-4444-4444-4444-444444444444', 'bruteforce', 'Bruteforce IPs', 'Brute force attack sources', 'bg-yellow-500', 'Zap', true, 'system', 24, true),
('55555555-5555-5555-5555-555555555555', 'sources', 'Source Intelligence', 'Threat intelligence from external sources', 'bg-indigo-500', 'Database', true, 'system', NULL, false);

-- Create functions and triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ip_entries_modtime 
    BEFORE UPDATE ON ip_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

-- Function to set IP entry expiration based on category settings
CREATE OR REPLACE FUNCTION set_ip_entry_expiration()
RETURNS TRIGGER AS $$
DECLARE
    category_expiration_hours INTEGER;
    category_auto_cleanup BOOLEAN;
BEGIN
    -- Get category expiration settings
    SELECT expiration_hours, auto_cleanup 
    INTO category_expiration_hours, category_auto_cleanup
    FROM categories 
    WHERE id = NEW.category_id;
    
    -- Set IP entry expiration if category has expiration settings
    IF category_auto_cleanup = true AND category_expiration_hours IS NOT NULL AND category_expiration_hours > 0 THEN
        NEW.expires_at := NEW.date_added + (category_expiration_hours || ' hours')::INTERVAL;
        NEW.auto_remove := true;
    ELSE
        NEW.expires_at := NULL;
        NEW.auto_remove := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ip_entry_expiration_trigger
    BEFORE INSERT ON ip_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_ip_entry_expiration();

-- Function to update existing IP entries when category expiration changes
CREATE OR REPLACE FUNCTION update_ip_entries_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all IP entries in this category when expiration settings change
    IF OLD.expiration_hours IS DISTINCT FROM NEW.expiration_hours OR 
       OLD.auto_cleanup IS DISTINCT FROM NEW.auto_cleanup THEN
        
        IF NEW.auto_cleanup = true AND NEW.expiration_hours IS NOT NULL AND NEW.expiration_hours > 0 THEN
            -- Set expiration for all IP entries in this category
            UPDATE ip_entries 
            SET expires_at = date_added + (NEW.expiration_hours || ' hours')::INTERVAL,
                auto_remove = true
            WHERE category_id = NEW.id;
        ELSE
            -- Remove expiration for all IP entries in this category
            UPDATE ip_entries 
            SET expires_at = NULL,
                auto_remove = false
            WHERE category_id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ip_entries_expiration_trigger
    AFTER UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_ip_entries_expiration();

-- Function to clean up expired IP entries
CREATE OR REPLACE FUNCTION cleanup_expired_ip_entries()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    -- Delete expired IP entries where auto_remove is true
    DELETE FROM ip_entries 
    WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP 
    AND auto_remove = true;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Database restored successfully with expiration support!' as status;