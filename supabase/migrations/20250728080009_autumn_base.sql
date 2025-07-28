-- Fix category expiration functionality completely
-- This migration fixes all issues with category expiration and IP entry sync

-- First, ensure the expiration_hours column exists and has correct type
DO $$ 
BEGIN
    -- Check if expiration_hours column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'expiration_hours') THEN
        ALTER TABLE categories ADD COLUMN expiration_hours INTEGER NULL;
    END IF;
    
    -- Check if auto_cleanup column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'auto_cleanup') THEN
        ALTER TABLE categories ADD COLUMN auto_cleanup BOOLEAN DEFAULT false;
    END IF;
    
    -- Check if expires_at and auto_remove columns exist in ip_entries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_entries' AND column_name = 'expires_at') THEN
        ALTER TABLE ip_entries ADD COLUMN expires_at TIMESTAMP NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_entries' AND column_name = 'auto_remove') THEN
        ALTER TABLE ip_entries ADD COLUMN auto_remove BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_expiration_hours ON categories(expiration_hours) WHERE expiration_hours IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_entries_expires_at ON ip_entries(expires_at) WHERE expires_at IS NOT NULL;

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

-- Create trigger for new IP entries
DROP TRIGGER IF EXISTS set_ip_entry_expiration_trigger ON ip_entries;
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

-- Create trigger for category updates
DROP TRIGGER IF EXISTS update_ip_entries_expiration_trigger ON categories;
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

-- Update existing IP entries to have proper expiration based on their categories
UPDATE ip_entries 
SET expires_at = CASE 
    WHEN c.auto_cleanup = true AND c.expiration_hours IS NOT NULL AND c.expiration_hours > 0 
    THEN ip_entries.date_added + (c.expiration_hours || ' hours')::INTERVAL
    ELSE NULL
END,
auto_remove = CASE 
    WHEN c.auto_cleanup = true AND c.expiration_hours IS NOT NULL AND c.expiration_hours > 0 
    THEN true
    ELSE false
END
FROM categories c
WHERE ip_entries.category_id = c.id;

-- Show results
SELECT 
    'Category expiration system fixed successfully!' as status,
    COUNT(*) as total_categories,
    COUNT(CASE WHEN expiration_hours IS NOT NULL THEN 1 END) as categories_with_expiration,
    COUNT(CASE WHEN auto_cleanup = true THEN 1 END) as categories_with_auto_cleanup
FROM categories;

SELECT 
    'IP entries updated with expiration!' as status,
    COUNT(*) as total_ip_entries,
    COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as ip_entries_with_expiration,
    COUNT(CASE WHEN auto_remove = true THEN 1 END) as ip_entries_with_auto_remove
FROM ip_entries;