-- SQL Commands to Fix Added By Field
-- Run these commands in your PostgreSQL query tool (pgAdmin, DBeaver, etc.)

-- Step 1: Check current state of added_by field
SELECT 
    ip,
    added_by,
    CASE 
        WHEN added_by IS NULL THEN 'NULL'
        WHEN added_by = '' THEN 'EMPTY STRING'
        WHEN TRIM(added_by) = '' THEN 'WHITESPACE ONLY'
        ELSE 'HAS VALUE: ' || added_by
    END as added_by_status,
    date_added
FROM ip_entries 
ORDER BY date_added DESC 
LIMIT 10;

-- Step 2: Count entries by added_by status
SELECT 
    CASE 
        WHEN added_by IS NULL THEN 'NULL'
        WHEN added_by = '' THEN 'EMPTY STRING'
        WHEN TRIM(added_by) = '' THEN 'WHITESPACE ONLY'
        ELSE 'HAS VALUE'
    END as status,
    COUNT(*) as count
FROM ip_entries 
GROUP BY 
    CASE 
        WHEN added_by IS NULL THEN 'NULL'
        WHEN added_by = '' THEN 'EMPTY STRING'
        WHEN TRIM(added_by) = '' THEN 'WHITESPACE ONLY'
        ELSE 'HAS VALUE'
    END;

-- Step 3: Fix all NULL or empty added_by fields
UPDATE ip_entries 
SET added_by = 'admin' 
WHERE added_by IS NULL OR added_by = '' OR TRIM(added_by) = '';

-- Step 4: Verify the fix worked
SELECT 
    ip,
    added_by,
    date_added
FROM ip_entries 
ORDER BY date_added DESC 
LIMIT 10;

-- Step 5: Check final count
SELECT 
    COUNT(*) as total_entries, 
    COUNT(CASE WHEN added_by IS NOT NULL AND added_by != '' THEN 1 END) as entries_with_added_by
FROM ip_entries;