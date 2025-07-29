import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType } from '../types';
import { CONFIG } from '../config/environment';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [passwordStatus, setPasswordStatus] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');
    if (storedUser && storedToken) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAuthenticated(true);
      // Fetch password status for authenticated user
      fetchPasswordStatus();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
      fetchPasswordStatus();
    }
  }, [isAuthenticated]);

  const fetchPasswordStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${CONFIG.apiEndpoint}/users/my-password-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const statusData = await response.json();
        setPasswordStatus(statusData);
      }
    } catch (error) {
      console.error('Failed to fetch password status:', error);
    }
  };
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${CONFIG.apiEndpoint}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const usersData = await response.json();
        console.log('🔍 Raw users data from API:', usersData.slice(0, 2));
        const formattedUsers = usersData.map((u: any) => ({
          ...u,
          createdAt: new Date(u.created_at),
          isActive: u.is_active,
          mustChangePassword: u.must_change_password || false,
          assignedCategories: u.assigned_categories || [],
          createdBy: u.created_by || 'Unknown',
          passwordChangedAt: u.password_changed_at ? new Date(u.password_changed_at) : undefined,
          passwordExpiresAt: u.password_expires_at ? new Date(u.password_expires_at) : undefined,
          passwordStatus: u.password_status,
          daysUntilExpiry: u.days_until_expiry
        }));
        console.log('🔍 Formatted users data:', formattedUsers.slice(0, 2));
        setUsers(formattedUsers);
      } else {
        console.error('Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const login = async (
    username: string,
    password: string
  ): Promise<{ success?: boolean; forcePasswordChange?: boolean }> => {
    try {
      console.log('Attempting database login for:', username);
      
      const response = await fetch(`${CONFIG.apiEndpoint}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      console.log('Login response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Login successful, received data:', data);
        
        const userData = {
          ...data.user,
          createdAt: new Date(data.user.created_at),
          isActive: data.user.is_active,
          mustChangePassword: data.user.must_change_password || false,
          assignedCategories: data.user.assigned_categories || []
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        localStorage.setItem('auth_token', data.token);
        
        if (userData.mustChangePassword) {
          return { success: true, forcePasswordChange: true };
        }
        
        return { success: true };
      } else {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        return {};
      }
    } catch (error) {
      console.error('Login error:', error);
      return {};
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  const createUser = async (
    userData: Omit<User, 'id' | 'createdAt' | 'mustChangePassword'>
  ): Promise<boolean> => {
    if (!user || user.role !== 'superadmin' || !user.isActive) return false;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${CONFIG.apiEndpoint}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          role: userData.role,
          assignedCategories: userData.assignedCategories,
          password: userData.password
        })
      });

      if (response.ok) {
        await fetchUsers();
        return true;
      }
    } catch (error) {
      console.error('Create user error:', error);
    }

    return false;
  };

  const updateUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
    if (!user || user.role !== 'superadmin' || !user.isActive) return false;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${CONFIG.apiEndpoint}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          role: userData.role,
          assignedCategories: userData.assignedCategories,
          password: userData.password,
          isActive: userData.isActive,
          mustChangePassword: userData.mustChangePassword
        })
      });

      if (response.ok) {
        await fetchUsers();
        
        if (userId === user.id) {
          const updatedUser = { ...user, ...userData };
          setUser(updatedUser);
          localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        }
        
        return true;
      }
    } catch (error) {
      console.error('Update user error:', error);
    }

    return false;
  };

  const updatePassword = async (newPassword: string, currentPassword?: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false };

    try {
      console.log('Updating password for user:', user.id);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${CONFIG.apiEndpoint}/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newPassword: newPassword,
          currentPassword: currentPassword
        })
      });

      console.log('Password update response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Password update failed:', errorData);
        return { success: false, message: errorData.error };
      }

        const updatedUser = { ...user, mustChangePassword: false };
        setUser(updatedUser);
        setIsAuthenticated(true);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        // Refresh password status after successful change
        await fetchPasswordStatus();
        console.log('Password updated successfully');
        return { success: true };
    } catch (error) {
      console.error('Update password error:', error);
    }

    return { success: false, message: 'Network error occurred' };
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    if (!user || user.role !== 'superadmin' || !user.isActive) return false;
    
    console.log('Attempting to delete user:', userId);
    console.log('Current user ID:', user.id);
    
    if (userId === user.id) {
      console.log('Cannot delete own account');
      return false;
    }

    try {
      const token = localStorage.getItem('auth_token');
      console.log('Making delete request to:', `${CONFIG.apiEndpoint}/users/${userId}`);
      
      const response = await fetch(`${CONFIG.apiEndpoint}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        return false;
      }
      
      if (response.ok) {
        console.log('User deleted successfully, refreshing user list');
        await fetchUsers();
        return true;
      }
    } catch (error) {
      console.error('Delete user error:', error);
    }

    return false;
  };

  const toggleUserStatus = async (userId: string): Promise<boolean> => {
    if (!user || user.role !== 'superadmin' || !user.isActive) return false;
    if (userId === user.id) return false;

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return false;

    return await updateUser(userId, { isActive: !targetUser.isActive });
  };

  const refreshUsers = async (): Promise<void> => {
    await fetchUsers();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        users,
        createUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        refreshUsers,
        updatePassword,
        passwordStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};