-- Add expiration_hours column to categories table
-- This replaces the expires_at timestamp with a duration in hours

-- Add the new column
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS expiration_hours INTEGER NULL;

-- Update existing categories that have expires_at to use expiration_hours
-- Convert existing expires_at to hours from created_at
UPDATE categories 
SET expiration_hours = EXTRACT(EPOCH FROM (expires_at - created_at)) / 3600
WHERE expires_at IS NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN categories.expiration_hours IS 'Number of hours after which IP entries in this category expire (from their creation time)';

-- Show the updated structure
SELECT 
    'Expiration hours column added successfully!' as status,
    COUNT(*) as total_categories,
    COUNT(CASE WHEN expiration_hours IS NOT NULL THEN 1 END) as categories_with_expiration_hours
FROM categories;

-- Show sample data
SELECT 
    id,
    name,
    label,
    expiration_hours,
    auto_cleanup,
    created_at
FROM categories
ORDER BY created_at
LIMIT 10;