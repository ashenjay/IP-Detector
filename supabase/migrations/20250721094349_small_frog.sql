-- Fix users table and ensure admin user exists
-- Run this in pgAdmin to fix authentication issues

-- First, let's make sure the users table has the correct structure
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS users (
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

-- Delete existing admin user if exists (to avoid conflicts)
DELETE FROM users WHERE username = 'admin';

-- Insert admin user with correct structure
INSERT INTO users (
    username, 
    email, 
    password, 
    role, 
    is_active, 
    must_change_password, 
    created_by, 
    created_at
) VALUES (
    'admin',
    'admin@company.com',
    'password',
    'superadmin',
    true,
    false,
    'system',
    CURRENT_TIMESTAMP
);

-- Insert demo users for testing
INSERT INTO users (username, email, password, role, assigned_categories, created_by, is_active, must_change_password) VALUES 
('soc_malware', 'soc.malware@company.com', 'password', 'soc_admin', ARRAY['malware', 'c2'], 'admin', true, false),
('soc_phishing', 'soc.phishing@company.com', 'password', 'soc_admin', ARRAY['phishing'], 'admin', true, false),
('viewer', 'viewer@company.com', 'password', 'viewer', NULL, 'admin', true, false)
ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    assigned_categories = EXCLUDED.assigned_categories,
    is_active = EXCLUDED.is_active,
    must_change_password = EXCLUDED.must_change_password;

-- Verify the admin user was created correctly
SELECT 
    id, 
    username, 
    email, 
    role, 
    is_active, 
    must_change_password,
    created_at
FROM users 
WHERE username = 'admin';

-- Show all users
SELECT 
    username, 
    email, 
    role, 
    is_active,
    assigned_categories
FROM users 
ORDER BY created_at;