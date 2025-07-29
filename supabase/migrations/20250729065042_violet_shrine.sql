/*
  # Create Expiration Categories System

  1. New Tables
    - `expiration_categories` - Separate table for expiration-based categories
    - Keep existing `categories` table for regular threat categories

  2. Features
    - Expiration categories have built-in expiration and auto-cleanup
    - Regular categories remain unchanged
    - Dashboard shows both types separately

  3. Security
    - Enable RLS on expiration_categories table
    - Add appropriate policies
*/

-- Create expiration_categories table
CREATE TABLE IF NOT EXISTS expiration_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(50) DEFAULT 'bg-orange-500',
  icon VARCHAR(50) DEFAULT 'Clock',
  expiration_hours INTEGER NOT NULL CHECK (expiration_hours > 0),
  auto_cleanup BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create expiration_ip_entries table
CREATE TABLE IF NOT EXISTS expiration_ip_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip VARCHAR(255) NOT NULL,
  type VARCHAR(20) DEFAULT 'ip' CHECK (type IN ('ip', 'hostname', 'fqdn')),
  expiration_category_id UUID REFERENCES expiration_categories(id) ON DELETE CASCADE,
  description TEXT,
  added_by VARCHAR(50) NOT NULL DEFAULT 'admin',
  date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  auto_remove BOOLEAN DEFAULT true,
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'abuseipdb', 'virustotal', 'other')),
  reputation JSONB,
  vt_reputation JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expiration_categories_name ON expiration_categories(name);
CREATE INDEX IF NOT EXISTS idx_expiration_categories_active ON expiration_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_expiration_ip_entries_category ON expiration_ip_entries(expiration_category_id);
CREATE INDEX IF NOT EXISTS idx_expiration_ip_entries_expires_at ON expiration_ip_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_expiration_ip_entries_ip ON expiration_ip_entries(ip);

-- Enable RLS
ALTER TABLE expiration_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expiration_ip_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read expiration categories"
  ON expiration_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Superadmins can manage expiration categories"
  ON expiration_categories
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read expiration IP entries"
  ON expiration_ip_entries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage expiration IP entries"
  ON expiration_ip_entries
  FOR ALL
  TO authenticated
  USING (true);

-- Function to set expiration on insert
CREATE OR REPLACE FUNCTION set_expiration_ip_entry_expiration()
RETURNS TRIGGER AS $$
DECLARE
    category_expiration_hours INTEGER;
BEGIN
    -- Get category expiration settings
    SELECT expiration_hours 
    INTO category_expiration_hours
    FROM expiration_categories 
    WHERE id = NEW.expiration_category_id;
    
    -- Set expiration time
    NEW.expires_at := NEW.date_added + (category_expiration_hours || ' hours')::INTERVAL;
    NEW.auto_remove := true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expiration IP entries
CREATE TRIGGER set_expiration_ip_entry_expiration_trigger
    BEFORE INSERT ON expiration_ip_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_expiration_ip_entry_expiration();

-- Function to cleanup expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_expiration_entries()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    -- Delete expired IP entries where auto_remove is true
    DELETE FROM expiration_ip_entries 
    WHERE expires_at < CURRENT_TIMESTAMP 
    AND auto_remove = true;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample expiration categories
INSERT INTO expiration_categories (name, label, description, color, icon, expiration_hours, created_by) VALUES 
('temp_block_24h', 'Temporary Block (24h)', 'Temporarily blocked IPs - auto-removed after 24 hours', 'bg-orange-500', 'Clock', 24, 'system'),
('temp_block_7d', 'Temporary Block (7 days)', 'Temporarily blocked IPs - auto-removed after 7 days', 'bg-yellow-500', 'Clock', 168, 'system'),
('temp_block_30d', 'Temporary Block (30 days)', 'Temporarily blocked IPs - auto-removed after 30 days', 'bg-red-500', 'Clock', 720, 'system')
ON CONFLICT (name) DO NOTHING;

-- Success message
SELECT 'Expiration categories system created successfully!' as status;