-- Fix the added_by field in the database
-- Run this in your PostgreSQL database

-- First, let's see what we have
SELECT 
    ip, 
    added_by, 
    date_added,
    CASE 
        WHEN added_by IS NULL THEN 'NULL'
        WHEN added_by = '' THEN 'EMPTY'
        ELSE added_by
    END as added_by_status
FROM ip_entries 
ORDER BY date_added DESC 
LIMIT 10;

-- Update all NULL or empty added_by fields to 'admin'
UPDATE ip_entries 
SET added_by = 'admin' 
WHERE added_by IS NULL OR added_by = '' OR TRIM(added_by) = '';

-- Verify the fix
SELECT 
    ip, 
    added_by, 
    date_added
FROM ip_entries 
ORDER BY date_added DESC 
LIMIT 10;

-- Check counts
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN added_by IS NOT NULL AND added_by != '' THEN 1 END) as entries_with_added_by,
    COUNT(CASE WHEN added_by IS NULL OR added_by = '' THEN 1 END) as entries_without_added_by
FROM ip_entries;