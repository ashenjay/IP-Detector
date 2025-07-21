-- Debug script to check the database structure and data
-- Run this in your PostgreSQL database to see what's happening

-- Check the structure of ip_entries table
\d ip_entries;

-- Check what data we have in ip_entries
SELECT 
    id, 
    ip, 
    added_by, 
    date_added,
    created_at
FROM ip_entries 
ORDER BY date_added DESC 
LIMIT 10;

-- Check if added_by field has data
SELECT 
    COUNT(*) as total_entries,
    COUNT(added_by) as entries_with_added_by,
    COUNT(*) - COUNT(added_by) as entries_without_added_by
FROM ip_entries;

-- Show unique values in added_by field
SELECT DISTINCT added_by, COUNT(*) as count
FROM ip_entries 
GROUP BY added_by
ORDER BY count DESC;