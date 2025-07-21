-- Fix existing entries that have NULL added_by field
-- Run this in your PostgreSQL database

-- Update entries with NULL added_by to 'admin'
UPDATE ip_entries 
SET added_by = 'admin' 
WHERE added_by IS NULL OR added_by = '';

-- Check the results
SELECT 
    ip,
    added_by,
    date_added
FROM ip_entries 
ORDER BY date_added DESC;

-- Verify all entries now have added_by
SELECT 
    COUNT(*) as total_entries,
    COUNT(added_by) as entries_with_added_by
FROM ip_entries;