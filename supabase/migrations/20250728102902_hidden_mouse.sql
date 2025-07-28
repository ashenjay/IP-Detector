-- Add expiration columns to categories table
-- This migration adds the missing expiration_hours and auto_cleanup columns

-- Add expiration_hours column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'expiration_hours') THEN
        ALTER TABLE categories ADD COLUMN expiration_hours INTEGER NULL;
        RAISE NOTICE 'Added expiration_hours column';
    END IF;
END $$;

-- Add auto_cleanup column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'auto_cleanup') THEN
        ALTER TABLE categories ADD COLUMN auto_cleanup BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added auto_cleanup column';
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_expiration_hours ON categories(expiration_hours) WHERE expiration_hours IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_auto_cleanup ON categories(auto_cleanup) WHERE auto_cleanup = true;

-- Show the updated schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'categories' 
    AND column_name IN ('expiration_hours', 'auto_cleanup')
ORDER BY column_name;

-- Success message
SELECT 'Expiration columns added successfully!' as status;