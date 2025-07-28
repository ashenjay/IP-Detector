-- Add expiration functionality to IP entries
-- Each IP entry will have its own expiration time

-- Add expiration fields to ip_entries table
ALTER TABLE ip_entries 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS auto_remove BOOLEAN DEFAULT true;

-- Add index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_ip_entries_expires_at ON ip_entries(expires_at) WHERE expires_at IS NOT NULL;

-- Function to automatically remove expired IP entries
CREATE OR REPLACE FUNCTION cleanup_expired_ip_entries()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    -- Delete expired IP entries
    DELETE FROM ip_entries 
    WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP 
    AND auto_remove = true;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % expired IP entries', expired_count;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to set category expiration to 24 hours from creation
CREATE OR REPLACE FUNCTION set_category_24h_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiration to 24 hours from creation if not already set
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := NEW.created_at + INTERVAL '24 hours';
        NEW.auto_cleanup := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set 24h expiration for new categories
DROP TRIGGER IF EXISTS set_category_expiration_trigger ON categories;
CREATE TRIGGER set_category_expiration_trigger
    BEFORE INSERT ON categories
    FOR EACH ROW
    EXECUTE FUNCTION set_category_24h_expiration();

-- Function to set IP entry expiration based on category expiration
CREATE OR REPLACE FUNCTION set_ip_entry_expiration()
RETURNS TRIGGER AS $$
DECLARE
    category_expires TIMESTAMP;
BEGIN
    -- Get category expiration time
    SELECT expires_at INTO category_expires
    FROM categories 
    WHERE id = NEW.category_id;
    
    -- Set IP entry expiration to category expiration time if not set
    IF NEW.expires_at IS NULL AND category_expires IS NOT NULL THEN
        NEW.expires_at := category_expires;
        NEW.auto_remove := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set IP entry expiration
DROP TRIGGER IF EXISTS set_ip_entry_expiration_trigger ON ip_entries;
CREATE TRIGGER set_ip_entry_expiration_trigger
    BEFORE INSERT ON ip_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_ip_entry_expiration();

-- Update existing categories to have 24h expiration if they don't have one
UPDATE categories 
SET expires_at = created_at + INTERVAL '24 hours',
    auto_cleanup = true
WHERE expires_at IS NULL;

-- Update existing IP entries to inherit category expiration
UPDATE ip_entries 
SET expires_at = c.expires_at,
    auto_remove = true
FROM categories c
WHERE ip_entries.category_id = c.id 
AND ip_entries.expires_at IS NULL 
AND c.expires_at IS NOT NULL;

-- Show results
SELECT 
    'IP entry expiration system added successfully!' as status,
    COUNT(*) as total_categories,
    COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as categories_with_expiration
FROM categories;

SELECT 
    'IP entries updated with expiration!' as status,
    COUNT(*) as total_ip_entries,
    COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as ip_entries_with_expiration
FROM ip_entries;