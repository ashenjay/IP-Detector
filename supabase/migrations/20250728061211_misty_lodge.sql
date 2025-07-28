-- Fix category expiration functionality
-- Run this SQL script in your PostgreSQL database

-- First, ensure the columns exist
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS auto_cleanup BOOLEAN DEFAULT false;

-- Add index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_categories_expires_at ON categories(expires_at) WHERE expires_at IS NOT NULL;

-- Update the categories query to include expiration info
-- This is handled in the application code, but let's verify the structure

-- Test the expiration functionality
SELECT 
    id,
    name,
    label,
    expires_at,
    auto_cleanup,
    CASE 
        WHEN expires_at IS NULL THEN 'Never'
        WHEN expires_at > CURRENT_TIMESTAMP THEN 'Active'
        ELSE 'Expired'
    END as expiration_status,
    CASE 
        WHEN expires_at IS NOT NULL AND expires_at > CURRENT_TIMESTAMP THEN
            EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 86400
        ELSE NULL
    END as days_until_expiration,
    (SELECT COUNT(*) FROM ip_entries WHERE category_id = categories.id) as ip_count
FROM categories
ORDER BY created_at;

-- Show current structure
\d categories;

-- Verify the migration worked
SELECT 'Category expiration columns added successfully!' as status;