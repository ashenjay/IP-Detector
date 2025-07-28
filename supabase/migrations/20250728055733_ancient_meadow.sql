-- Create category expiration functionality
-- This migration adds expiration fields to categories and creates cleanup functionality

-- Add expiration fields to categories table (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'expires_at') THEN
        ALTER TABLE categories ADD COLUMN expires_at TIMESTAMP NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'auto_cleanup') THEN
        ALTER TABLE categories ADD COLUMN auto_cleanup BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_categories_expires_at ON categories(expires_at) WHERE expires_at IS NOT NULL;

-- Create a function to clean up expired category data
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
        
        -- Log the cleanup (you can remove this if not needed)
        RAISE NOTICE 'Cleaned up % IP entries from expired category: %', expired_count, category_record.label;
        
        -- Optionally deactivate the category (keep it but mark as inactive)
        UPDATE categories 
        SET is_active = false, 
            description = description || ' (Expired on ' || expires_at::date || ')'
        WHERE id = category_record.id;
    END LOOP;
    
    RETURN total_cleaned;
END;
$$ LANGUAGE plpgsql;

-- Create a function to extend category expiration
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

-- Create a view to show categories with expiration status
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

-- Show the updated structure
SELECT 
    'Category expiration feature added successfully!' as status,
    COUNT(*) as total_categories,
    COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as categories_with_expiration
FROM categories;