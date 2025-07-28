-- Remove unwanted categories from the database
-- Run this script to clean up categories you don't want

-- First, let's see what categories exist
SELECT id, name, label, description FROM categories ORDER BY name;

-- Remove specific categories (you can uncomment the ones you want to remove)

-- Remove Bruteforce IPs category
-- DELETE FROM ip_entries WHERE category_id = '44444444-4444-4444-4444-444444444444';
-- DELETE FROM categories WHERE id = '44444444-4444-4444-4444-444444444444';

-- Remove Source Intelligence category  
-- DELETE FROM ip_entries WHERE category_id = '55555555-5555-5555-5555-555555555555';
-- DELETE FROM categories WHERE id = '55555555-5555-5555-5555-555555555555';

-- Remove Phishing IPs category
-- DELETE FROM ip_entries WHERE category_id = '22222222-2222-2222-2222-222222222222';
-- DELETE FROM categories WHERE id = '22222222-2222-2222-2222-222222222222';

-- Remove C2 IPs category
-- DELETE FROM ip_entries WHERE category_id = '33333333-3333-3333-3333-333333333333';
-- DELETE FROM categories WHERE id = '33333333-3333-3333-3333-333333333333';

-- Keep only Malware IPs category (uncomment if you want only this one)
-- DELETE FROM ip_entries WHERE category_id != '11111111-1111-1111-1111-111111111111';
-- DELETE FROM categories WHERE id != '11111111-1111-1111-1111-111111111111' AND is_default = true;

-- Show remaining categories after cleanup
SELECT id, name, label, description FROM categories ORDER BY name;

-- Show IP entries count by category after cleanup
SELECT 
    c.name as category,
    c.label,
    COUNT(ie.id) as ip_count
FROM categories c
LEFT JOIN ip_entries ie ON c.id = ie.category_id
GROUP BY c.id, c.name, c.label
ORDER BY c.name;