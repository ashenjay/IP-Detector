-- Check current database structure and users
-- Run this in pgAdmin to see what's in your database

-- Check if users table exists and its structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check current users in database
SELECT id, username, email, role, is_active, created_at 
FROM users;

-- Check if admin user exists
SELECT * FROM users WHERE username = 'admin';

-- Check categories
SELECT id, name, label, is_active FROM categories;

-- Check table counts
SELECT 
    (SELECT COUNT(*) FROM users) as user_count,
    (SELECT COUNT(*) FROM categories) as category_count,
    (SELECT COUNT(*) FROM ip_entries) as ip_count,
    (SELECT COUNT(*) FROM whitelist) as whitelist_count;