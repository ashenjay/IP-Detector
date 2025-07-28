-- Fix category expiration functionality
-- Run this SQL script in your PostgreSQL database

-- First, ensure the columns exist (safe to run multiple times)
DO $$ 
BEGIN
    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'expires_at') THEN
        ALTER TABLE categories ADD COLUMN expires_at TIMESTAMP NULL;
    END IF;
    
    -- Add auto_cleanup column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'auto_cleanup') THEN
        ALTER TABLE categories ADD COLUMN auto_cleanup BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_categories_expires_at ON categories(expires_at) WHERE expires_at IS NOT NULL;

-- Create or replace the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_category_data()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    category_record RECORD;
    total_cleaned INTEGER := 0;
BEGIN
    -- Find categories that have expired and have auto_cleanup enabled
    FOR category_record IN 
        SELECT id, name, label, expires_at 
        FROM categories 
        WHERE expires_at IS NOT NULL 
        AND expires_at < CURRENT_TIMESTAMP 
        AND auto_cleanup = true
        AND is_active = true
    LOOP
        -- Delete IP entries from expired category
        DELETE FROM ip_entries WHERE category_id = category_record.id;
        
        -- Get count of deleted entries
        GET DIAGNOSTICS expired_count = ROW_COUNT;
        total_cleaned := total_cleaned + expired_count;
        
        -- Log the cleanup
        RAISE NOTICE 'Cleaned up % IP entries from expired category: %', expired_count, category_record.label;
        
        -- Update category description to show it was cleaned
        UPDATE categories 
        SET description = description || ' (Auto-cleaned on ' || CURRENT_TIMESTAMP::date || ')'
        WHERE id = category_record.id;
    END LOOP;
    
    RETURN total_cleaned;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the extend expiration function
CREATE OR REPLACE FUNCTION extend_category_expiration(
    category_id_param UUID,
    new_expiration TIMESTAMP
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE categories 
    SET expires_at = new_expiration,
        is_active = true
    WHERE id = category_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the view for categories with expiration status
CREATE OR REPLACE VIEW categories_with_expiration AS
SELECT 
    c.*,
    CASE 
        WHEN c.expires_at IS NULL THEN 'Never'
        WHEN c.expires_at > CURRENT_TIMESTAMP THEN 'Active'
        ELSE 'Expired'
    END as expiration_status,
    CASE 
        WHEN c.expires_at IS NOT NULL AND c.expires_at > CURRENT_TIMESTAMP THEN
            EXTRACT(EPOCH FROM (c.expires_at - CURRENT_TIMESTAMP)) / 86400
        ELSE NULL
    END as days_until_expiration,
    (SELECT COUNT(*) FROM ip_entries WHERE category_id = c.id) as ip_count
FROM categories c
ORDER BY c.created_at DESC;

-- Test the expiration functionality
SELECT 
    'Category expiration functionality fixed successfully!' as status,
    COUNT(*) as total_categories,
    COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as categories_with_expiration
FROM categories;

-- Show sample of categories with expiration info
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
    END as expiration_status
FROM categories
ORDER BY created_at
LIMIT 10;