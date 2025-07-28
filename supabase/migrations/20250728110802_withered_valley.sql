-- Remove all categories except SOC operation categories
-- This will keep only: soc_operation_fqdn, soc_operation_ipv4, soc_operation_ipv6

-- First, let's see what we have
SELECT category, label, ip_count FROM (
    SELECT 
        c.name as category,
        c.label,
        COUNT(ie.id) as ip_count
    FROM categories c
    LEFT JOIN ip_entries ie ON c.id = ie.category_id
    GROUP BY c.id, c.name, c.label
    ORDER BY c.name
) as category_stats;

-- Remove IP entries from categories we're going to delete
DELETE FROM ip_entries WHERE category_id IN (
    SELECT id FROM categories 
    WHERE name NOT IN ('soc_operation_fqdn', 'soc_operation_ipv4', 'soc_operation_ipv6')
);

-- Remove the unwanted categories
DELETE FROM categories 
WHERE name NOT IN ('soc_operation_fqdn', 'soc_operation_ipv4', 'soc_operation_ipv6');

-- Show what's left
SELECT 
    c.name as category,
    c.label,
    c.description,
    c.is_active,
    COUNT(ie.id) as ip_count
FROM categories c
LEFT JOIN ip_entries ie ON c.id = ie.category_id
GROUP BY c.id, c.name, c.label, c.description, c.is_active
ORDER BY c.name;

-- Success message
SELECT 'Cleanup completed! Only SOC operation categories remain.' as status;