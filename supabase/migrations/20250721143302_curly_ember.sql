-- Add realistic threat intelligence IP entries
-- Run this in your PostgreSQL database

-- Add malware IPs with various CIDR ranges
INSERT INTO ip_entries (ip, type, category_id, description, added_by, source) VALUES 
-- Malware C&C servers and networks
('185.220.100.240/32', 'ip', '11111111-1111-1111-1111-111111111111', 'Tor exit node - malware traffic', 'admin', 'manual'),
('198.51.100.0/24', 'ip', '11111111-1111-1111-1111-111111111111', 'Botnet command network', 'admin', 'manual'),
('203.0.113.50/32', 'ip', '11111111-1111-1111-1111-111111111111', 'Zeus banking trojan C&C', 'admin', 'manual'),
('192.0.2.100/30', 'ip', '11111111-1111-1111-1111-111111111111', 'Ransomware payment server range', 'admin', 'manual'),
('172.16.254.0/24', 'ip', '11111111-1111-1111-1111-111111111111', 'Malware distribution network', 'admin', 'manual'),
('10.0.0.50/32', 'ip', '11111111-1111-1111-1111-111111111111', 'Internal compromised host', 'admin', 'manual'),
('91.240.118.0/23', 'ip', '11111111-1111-1111-1111-111111111111', 'Known malware hosting provider', 'admin', 'manual'),
('185.159.158.0/24', 'ip', '11111111-1111-1111-1111-111111111111', 'Bulletproof hosting - malware', 'admin', 'manual');

-- Add phishing IPs
INSERT INTO ip_entries (ip, type, category_id, description, added_by, source) VALUES 
('104.21.0.0/20', 'ip', '22222222-2222-2222-2222-222222222222', 'Phishing campaign infrastructure', 'admin', 'manual'),
('172.67.0.0/16', 'ip', '22222222-2222-2222-2222-222222222222', 'Cloudflare - phishing sites', 'admin', 'manual'),
('192.168.1.200/32', 'ip', '22222222-2222-2222-2222-222222222222', 'Email phishing server', 'admin', 'manual'),
('203.0.113.75/32', 'ip', '22222222-2222-2222-2222-222222222222', 'Fake banking site', 'admin', 'manual'),
('198.51.100.25/32', 'ip', '22222222-2222-2222-2222-222222222222', 'PayPal phishing server', 'admin', 'manual');

-- Add C2 servers
INSERT INTO ip_entries (ip, type, category_id, description, added_by, source) VALUES 
('45.142.214.0/24', 'ip', '33333333-3333-3333-3333-333333333333', 'APT command and control network', 'admin', 'manual'),
('185.220.101.0/24', 'ip', '33333333-3333-3333-3333-333333333333', 'Tor-based C2 infrastructure', 'admin', 'manual'),
('192.0.2.150/32', 'ip', '33333333-3333-3333-3333-333333333333', 'Cobalt Strike beacon', 'admin', 'manual'),
('203.0.113.125/32', 'ip', '33333333-3333-3333-3333-333333333333', 'Metasploit C2 server', 'admin', 'manual');

-- Add bruteforce sources
INSERT INTO ip_entries (ip, type, category_id, description, added_by, source) VALUES 
('103.0.0.0/8', 'ip', '44444444-4444-4444-4444-444444444444', 'APAC bruteforce source range', 'admin', 'manual'),
('185.0.0.0/8', 'ip', '44444444-4444-4444-4444-444444444444', 'European bruteforce networks', 'admin', 'manual'),
('192.168.2.0/24', 'ip', '44444444-4444-4444-4444-444444444444', 'SSH bruteforce attempts', 'admin', 'manual'),
('198.51.100.200/29', 'ip', '44444444-4444-4444-4444-444444444444', 'RDP bruteforce cluster', 'admin', 'manual'),
('203.0.113.0/25', 'ip', '44444444-4444-4444-4444-444444444444', 'FTP bruteforce network', 'admin', 'manual');

-- Add some domains and hostnames too
INSERT INTO ip_entries (ip, type, category_id, description, added_by, source) VALUES 
('malware-c2.evil.com', 'fqdn', '11111111-1111-1111-1111-111111111111', 'Known malware domain', 'admin', 'manual'),
('phishing-bank.fake.net', 'fqdn', '22222222-2222-2222-2222-222222222222', 'Fake banking domain', 'admin', 'manual'),
('c2-server.badactor.org', 'fqdn', '33333333-3333-3333-3333-333333333333', 'C2 communication domain', 'admin', 'manual'),
('bruteforce-bot', 'hostname', '44444444-4444-4444-4444-444444444444', 'Bruteforce bot hostname', 'admin', 'manual');

-- Check the results
SELECT 
    c.name as category,
    c.label,
    COUNT(ie.id) as ip_count
FROM categories c
LEFT JOIN ip_entries ie ON c.id = ie.category_id
GROUP BY c.id, c.name, c.label
ORDER BY c.name;

-- Show sample entries
SELECT 
    ie.ip,
    ie.type,
    c.label as category,
    ie.description
FROM ip_entries ie
JOIN categories c ON ie.category_id = c.id
ORDER BY c.name, ie.ip
LIMIT 20;