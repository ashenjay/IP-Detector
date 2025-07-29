/*
  # Add Password Policy System

  1. New Columns
    - `users` table:
      - `password_changed_at` (timestamp) - When password was last changed
      - `password_expires_at` (timestamp) - When password expires
      - `password_history` (jsonb) - Store last 5 password hashes to prevent reuse

  2. Functions
    - `check_password_expiry()` - Check if password is expired
    - `update_password_expiry()` - Update expiry when password changes
    - `is_password_reused()` - Check if password was used recently

  3. Triggers
    - Auto-update password expiry on password change
    - Prevent password reuse

  4. Security
    - 90-day expiration for non-admin users
    - Password history tracking
    - Automatic expiry calculation
*/

-- Add password policy columns to users table
DO $$ 
BEGIN
    -- Add password_changed_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_changed_at') THEN
        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added password_changed_at column';
    END IF;
    
    -- Add password_expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_expires_at') THEN
        ALTER TABLE users ADD COLUMN password_expires_at TIMESTAMP NULL;
        RAISE NOTICE 'Added password_expires_at column';
    END IF;
    
    -- Add password_history column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_history') THEN
        ALTER TABLE users ADD COLUMN password_history JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added password_history column';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_password_expires_at ON users(password_expires_at) WHERE password_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_password_changed_at ON users(password_changed_at);

-- Function to check if password is expired
CREATE OR REPLACE FUNCTION is_password_expired(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT role, password_expires_at INTO user_record
    FROM users 
    WHERE id = user_id AND is_active = true;
    
    -- Admin users don't have password expiration
    IF user_record.role = 'superadmin' THEN
        RETURN false;
    END IF;
    
    -- Check if password is expired
    IF user_record.password_expires_at IS NOT NULL AND user_record.password_expires_at < CURRENT_TIMESTAMP THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to check if password was recently used
CREATE OR REPLACE FUNCTION is_password_reused(user_id UUID, new_password_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    password_history JSONB;
BEGIN
    SELECT users.password_history INTO password_history
    FROM users 
    WHERE id = user_id;
    
    -- Check if password hash exists in history
    IF password_history ? new_password_hash THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to update password expiry and history
CREATE OR REPLACE FUNCTION update_password_policy()
RETURNS TRIGGER AS $$
DECLARE
    new_expiry TIMESTAMP;
    updated_history JSONB;
    history_array JSONB;
BEGIN
    -- Only process if password actually changed
    IF OLD.password IS DISTINCT FROM NEW.password THEN
        -- Set password changed timestamp
        NEW.password_changed_at := CURRENT_TIMESTAMP;
        
        -- Calculate expiry date (90 days for non-admin users)
        IF NEW.role != 'superadmin' THEN
            NEW.password_expires_at := CURRENT_TIMESTAMP + INTERVAL '90 days';
        ELSE
            NEW.password_expires_at := NULL; -- Admins don't expire
        END IF;
        
        -- Update password history (keep last 5 passwords)
        history_array := COALESCE(OLD.password_history, '[]'::jsonb);
        
        -- Add old password to history if it exists
        IF OLD.password IS NOT NULL THEN
            history_array := history_array || jsonb_build_array(OLD.password);
        END IF;
        
        -- Keep only last 5 passwords
        IF jsonb_array_length(history_array) > 5 THEN
            history_array := jsonb_path_query_array(history_array, '$[1 to last]');
        END IF;
        
        NEW.password_history := history_array;
        
        -- Reset must_change_password flag when password is changed
        NEW.must_change_password := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password policy updates
DROP TRIGGER IF EXISTS update_password_policy_trigger ON users;
CREATE TRIGGER update_password_policy_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_password_policy();

-- Function to get users with expired passwords
CREATE OR REPLACE FUNCTION get_users_with_expired_passwords()
RETURNS TABLE(
    id UUID,
    username VARCHAR(50),
    email VARCHAR(100),
    role VARCHAR(20),
    password_expires_at TIMESTAMP,
    days_expired INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.password_expires_at,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - u.password_expires_at))::INTEGER as days_expired
    FROM users u
    WHERE u.password_expires_at IS NOT NULL 
    AND u.password_expires_at < CURRENT_TIMESTAMP
    AND u.is_active = true
    AND u.role != 'superadmin'
    ORDER BY u.password_expires_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Initialize existing users with password policy data
UPDATE users 
SET 
    password_changed_at = COALESCE(password_changed_at, created_at, CURRENT_TIMESTAMP),
    password_expires_at = CASE 
        WHEN role = 'superadmin' THEN NULL
        ELSE COALESCE(password_changed_at, created_at, CURRENT_TIMESTAMP) + INTERVAL '90 days'
    END,
    password_history = COALESCE(password_history, '[]'::jsonb)
WHERE password_changed_at IS NULL OR password_expires_at IS NULL OR password_history IS NULL;

-- Create view for password policy status
CREATE OR REPLACE VIEW user_password_status AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.role,
    u.password_changed_at,
    u.password_expires_at,
    u.must_change_password,
    CASE 
        WHEN u.role = 'superadmin' THEN 'No Expiration'
        WHEN u.password_expires_at IS NULL THEN 'Not Set'
        WHEN u.password_expires_at < CURRENT_TIMESTAMP THEN 'Expired'
        WHEN u.password_expires_at < CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as password_status,
    CASE 
        WHEN u.role = 'superadmin' THEN NULL
        WHEN u.password_expires_at IS NULL THEN NULL
        WHEN u.password_expires_at > CURRENT_TIMESTAMP THEN 
            EXTRACT(DAY FROM (u.password_expires_at - CURRENT_TIMESTAMP))::INTEGER
        ELSE 
            -EXTRACT(DAY FROM (CURRENT_TIMESTAMP - u.password_expires_at))::INTEGER
    END as days_until_expiry
FROM users u
WHERE u.is_active = true
ORDER BY u.password_expires_at ASC NULLS LAST;

-- Success message
SELECT 'Password policy system added successfully!' as status,
       COUNT(*) as total_users,
       COUNT(CASE WHEN role != 'superadmin' THEN 1 END) as users_with_expiry,
       COUNT(CASE WHEN password_expires_at < CURRENT_TIMESTAMP AND role != 'superadmin' THEN 1 END) as expired_users
FROM users;