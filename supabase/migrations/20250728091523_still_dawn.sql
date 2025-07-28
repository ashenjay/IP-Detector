-- Fix category schema and ensure proper data types
-- This migration ensures all category fields are properly defined

-- First, let's ensure the categories table has all required columns with correct types
DO $$ 
BEGIN
    -- Add expiration_hours column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'expiration_hours') THEN
        ALTER TABLE categories ADD COLUMN expiration_hours INTEGER NULL;
        RAISE NOTICE 'Added expiration_hours column';
    END IF;
    
    -- Add auto_cleanup column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'auto_cleanup') THEN
        ALTER TABLE categories ADD COLUMN auto_cleanup BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added auto_cleanup column';
    END IF;
    
    -- Ensure expiration_hours is INTEGER type (not BIGINT or other)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'expiration_hours' 
        AND data_type != 'integer'
    ) THEN
        ALTER TABLE categories ALTER COLUMN expiration_hours TYPE INTEGER USING expiration_hours::INTEGER;
        RAISE NOTICE 'Fixed expiration_hours data type to INTEGER';
    END IF;
    
    -- Ensure auto_cleanup is BOOLEAN type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'auto_cleanup' 
        AND data_type != 'boolean'
    ) THEN
        ALTER TABLE categories ALTER COLUMN auto_cleanup TYPE BOOLEAN USING auto_cleanup::BOOLEAN;
        RAISE NOTICE 'Fixed auto_cleanup data type to BOOLEAN';
    END IF;
END $$;

-- Add constraints to ensure data integrity
DO $$
BEGIN
    -- Add check constraint for expiration_hours (must be positive if not null)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'categories' 
        AND constraint_name = 'categories_expiration_hours_positive'
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT categories_expiration_hours_positive 
        CHECK (expiration_hours IS NULL OR expiration_hours > 0);
        RAISE NOTICE 'Added positive check constraint for expiration_hours';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_expiration_hours ON categories(expiration_hours) WHERE expiration_hours IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_auto_cleanup ON categories(auto_cleanup) WHERE auto_cleanup = true;

-- Update any invalid data
UPDATE categories 
SET expiration_hours = NULL 
WHERE expiration_hours IS NOT NULL AND expiration_hours <= 0;

UPDATE categories 
SET auto_cleanup = false 
WHERE auto_cleanup IS NULL;

-- Show the current schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'categories' 
ORDER BY ordinal_position;

-- Show current data
SELECT 
    id,
    name,
    label,
    expiration_hours,
    auto_cleanup,
    is_active
FROM categories
ORDER BY name;

-- Success message
SELECT 'Category schema fixed successfully!' as status;