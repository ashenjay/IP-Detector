import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCategory } from '../contexts/CategoryContext';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Calendar,
  User,
  Shield,
  Eye,
  EyeOff,
  Save,
  X,
  AlertCircle,
  Key,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const UserManagement: React.FC = () => {
  const { user, users, createUser, updateUser, deleteUser, toggleUserStatus, refreshUsers } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<any | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(async () => {
      console.log('Auto-refreshing user data...');
      await refreshUsers();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshUsers]);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'viewer' as 'viewer' | 'soc_admin' | 'superadmin',
    assignedCategories: [] as string[],
    password: '',
    confirmPassword: ''
  });

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      role: 'viewer',
      assignedCategories: [],
      password: '',
      confirmPassword: ''
    });
    setError('');
  };

  const handlePasswordReset = async (userId: string) => {
    setError('');
    
    // Validate password
    if (!resetPasswordData.newPassword.trim()) {
      setError('Password is required');
      return;
    }
    
    if (resetPasswordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const success = await updateUser(userId, { 
        password: resetPasswordData.newPassword 
      });
      
      if (success) {
        setShowPasswordResetModal(null);
        setResetPasswordData({ newPassword: '', confirmPassword: '' });
        setError('');
        // Show success message briefly
        const originalError = error;
        setError('Password reset successfully!');
        setTimeout(() => setError(originalError), 3000);
      } else {
        setError('Failed to reset password');
      }
    } catch (err) {
      setError('Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  const startPasswordReset = (userToReset: any) => {
    setShowPasswordResetModal(userToReset);
    setResetPasswordData({ newPassword: '', confirmPassword: '' });
    setError('');
  };

  const cancelPasswordReset = () => {
    setShowPasswordResetModal(null);
    setResetPasswordData({ newPassword: '', confirmPassword: '' });
    setError('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!formData.username.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate password
    if (!formData.password.trim()) {
      setError('Password is required');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);

    try {
      const userData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role,
        assignedCategories: formData.role === 'soc_admin' ? formData.assignedCategories : undefined,
        password: formData.password
      };

      const success = await createUser(userData);
      if (success) {
        resetForm();
        setShowCreateForm(false);
      } else {
        setError('Failed to add user. Username may already exist.');
      }
    } catch (err) {
      setError('Error adding user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    setError('');
    
    // Validate required fields
    if (!formData.username.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate password if provided
    if (formData.password.trim()) {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }
    
    setLoading(true);

    try {
      const userData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role,
        assignedCategories: formData.role === 'soc_admin' ? formData.assignedCategories : undefined,
        ...(formData.password.trim() && { password: formData.password })
      };

      const success = await updateUser(userId, userData);
      if (success) {
        setShowEditForm(false);
        setEditingUser(null);
        resetForm();
      } else {
        setError('Failed to update user. Username may already exist.');
      }
    } catch (err) {
      setError('Error updating user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    // Create a custom centered confirmation dialog
    const confirmed = await showConfirmDialog(
      'Delete User Confirmation',
      `Are you sure you want to delete user "${username}"?`,
      'This action cannot be undone.',
      'Delete User',
      'Cancel'
    );
    
    if (!confirmed) return;

    console.log('Deleting user:', { userId, username });
    setLoading(true);
    setError(''); // Clear any previous errors
    
    try {
      const success = await deleteUser(userId);
      console.log('Delete result:', success);
      
      if (!success) {
        setError(`Failed to delete user "${username}". You may not have sufficient permissions or the user may not exist.`);
      } else {
        console.log('User deleted successfully');
        // Clear error on success
        setError('');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      setError(`Error deleting user "${username}". Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    setLoading(true);
    try {
      const success = await toggleUserStatus(userId);
      if (!success) {
        setError('Failed to toggle user status');
      }
    } catch (err) {
      setError('Error toggling user status');
    } finally {
      setLoading(false);
    }
  };

  // Custom confirmation dialog function
  const showConfirmDialog = (title: string, message: string, subtitle: string, confirmText: string, cancelText: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      dialog.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all">
          <div class="text-center">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
            <p class="text-gray-600 mb-2">${message}</p>
            <p class="text-sm text-gray-500 mb-6">${subtitle}</p>
            <div class="flex space-x-3">
              <button id="confirm-btn" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                ${confirmText}
              </button>
              <button id="cancel-btn" class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                ${cancelText}
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      const confirmBtn = dialog.querySelector('#confirm-btn');
      const cancelBtn = dialog.querySelector('#cancel-btn');
      
      const cleanup = () => {
        document.body.removeChild(dialog);
      };
      
      confirmBtn?.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });
      
      cancelBtn?.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      
      // Close on background click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          cleanup();
          resolve(false);
        }
      });
    });
  };

  const startEdit = (userToEdit: any) => {
    setFormData({
      username: userToEdit.username,
      email: userToEdit.email,
      role: userToEdit.role,
      assignedCategories: userToEdit.assignedCategories || [],
      password: '',
      confirmPassword: ''
    });
    setEditingUser(userToEdit);
    setShowEditForm(true);
    setError('');
  };

  const cancelEdit = () => {
    setShowEditForm(false);
    setEditingUser(null);
    resetForm();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin': return <Shield className="h-4 w-4 text-red-600" />;
      case 'soc_admin': return <User className="h-4 w-4 text-blue-600" />;
      case 'viewer': return <Eye className="h-4 w-4 text-green-600" />;
      default: return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800';
      case 'soc_admin': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPasswordStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Expiring Soon': return 'bg-yellow-100 text-yellow-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      case 'No Expiration': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPasswordStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <CheckCircle2 className="h-3 w-3" />;
      case 'Expiring Soon': return <Clock className="h-3 w-3" />;
      case 'Expired': return <AlertTriangle className="h-3 w-3" />;
      case 'No Expiration': return <Shield className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };
  const { categories } = useCategory();

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only superadmins can access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden">
      {/* Cybersecurity Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(0,255,255,0.05)_25%,rgba(0,255,255,0.05)_26%,transparent_27%,transparent_74%,rgba(0,255,255,0.05)_75%,rgba(0,255,255,0.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(0,255,255,0.05)_25%,rgba(0,255,255,0.05)_26%,transparent_27%,transparent_74%,rgba(0,255,255,0.05)_75%,rgba(0,255,255,0.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
      </div>

      {/* Header */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-cyan-500/20 shadow-2xl relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.hash = '/'}
                className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors border border-cyan-500/30"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text font-mono">User Management</h1>
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs border border-cyan-500/30">
                {users.length} users
              </span>
              <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded-full text-xs border border-gray-500/30">
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 border border-blue-500/30"
            >
              <Plus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {error && (
          <div className="mb-6 flex items-center space-x-2 text-red-300 bg-red-500/20 p-4 rounded-lg border border-red-500/30">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
            <h3 className="text-lg font-semibold text-cyan-200 mb-4 font-mono">Add New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password (min 6 characters)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      role: e.target.value as any,
                      assignedCategories: e.target.value !== 'soc_admin' ? [] : prev.assignedCategories
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="viewer">Viewer (Read Only)</option>
                    <option value="soc_admin">SOC Admin (Category Manager)</option>
                    <option value="superadmin">Super Admin (Full Access)</option>
                  </select>
                </div>
                
                {formData.role === 'soc_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Categories *
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {categories.filter(c => c.isActive).map(cat => (
                        <label key={cat.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.assignedCategories.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedCategories: [...prev.assignedCategories, cat.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedCategories: prev.assignedCategories.filter(c => c !== cat.id)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{cat.label}</span>
                        </label>
                      ))}
                    </div>
                    {categories.filter(c => c.isActive).length === 0 && (
                      <p className="text-sm text-gray-500 italic">No active categories available</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Adding...' : 'Add User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit User Form */}
        {showEditForm && editingUser && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit User: {editingUser.username}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(editingUser.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      role: e.target.value as any,
                      assignedCategories: e.target.value !== 'soc_admin' ? [] : prev.assignedCategories
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="viewer">Viewer (Read Only)</option>
                    <option value="soc_admin">SOC Admin (Category Manager)</option>
                    <option value="superadmin">Super Admin (Full Access)</option>
                  </select>
                </div>
                
                {formData.role === 'soc_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Categories *
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {categories.filter(c => c.isActive).map(cat => (
                        <label key={cat.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.assignedCategories.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedCategories: [...prev.assignedCategories, cat.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedCategories: prev.assignedCategories.filter(c => c !== cat.id)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{cat.label}</span>
                        </label>
                      ))}
                    </div>
                    {categories.filter(c => c.isActive).length === 0 && (
                      <p className="text-sm text-gray-500 italic">No active categories available</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Updating...' : 'Update User'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Key className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Reset Password
                  </h3>
                  <p className="text-sm text-gray-600">
                    Reset password for: <strong>{showPasswordResetModal.username}</strong>
                  </p>
                </div>
              </div>
              
              {error && (
                <div className="mb-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={resetPasswordData.newPassword}
                    onChange={(e) => setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter new password (min 6 characters)"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={resetPasswordData.confirmPassword}
                    onChange={(e) => setResetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handlePasswordReset(showPasswordResetModal.id)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  onClick={cancelPasswordReset}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> The user will need to use this new password on their next login.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Password Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{userItem.username}</span>
                        </div>
                        <div className="text-sm text-gray-500">{userItem.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(userItem.role)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userItem.role)}`}>
                            {userItem.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        {userItem.assignedCategories && userItem.assignedCategories.length > 0 && (
                          <div className="mt-1">
                            <div className="flex flex-wrap gap-1">
                              {userItem.assignedCategories.map(catId => {
                                const category = categories.find(c => c.id === catId);
                                return category ? (
                                <span key={catId} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                  {category.label}
                                </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {userItem.isActive ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {userItem.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center space-x-2">
                          {userItem.role === 'superadmin' ? (
                            <>
                              <Shield className="h-3 w-3" />
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                No Expiration
                              </span>
                            </>
                          ) : userItem.passwordExpiresAt ? (
                            (() => {
                              const now = new Date();
                              const expiresAt = new Date(userItem.passwordExpiresAt);
                              const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              
                              if (daysUntilExpiry < 0) {
                                return (
                                  <>
                                    <AlertTriangle className="h-3 w-3" />
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Expired
                                    </span>
                                  </>
                                );
                              } else if (daysUntilExpiry <= 15) {
                                return (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Expiring Soon
                                    </span>
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Active
                                    </span>
                                  </>
                                );
                              }
                            })()
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" />
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Not Set
                              </span>
                            </>
                          )}
                        </div>
                        {userItem.passwordExpiresAt && userItem.role !== 'superadmin' && (
                          <div className="text-xs text-gray-500 mt-1">
                            {(() => {
                              const now = new Date();
                              const expiresAt = new Date(userItem.passwordExpiresAt);
                              const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              
                              if (daysUntilExpiry > 0) {
                                return `${daysUntilExpiry} days left`;
                              } else if (daysUntilExpiry < 0) {
                                return `${Math.abs(daysUntilExpiry)} days overdue`;
                              } else {
                                return 'Expires today';
                              }
                            })()}
                          </div>
                        )}
                        {userItem.passwordChangedAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Changed: {new Date(userItem.passwordChangedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{userItem.createdBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {userItem.id !== '1' && userItem.id !== user?.id && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(userItem.id)}
                              disabled={loading}
                              className={`${
                                userItem.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                              } disabled:opacity-50 transition-colors`}
                              title={userItem.isActive ? 'Deactivate user' : 'Activate user'}
                            >
                              {userItem.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => startPasswordReset(userItem)}
                              disabled={loading}
                              className="text-orange-600 hover:text-orange-700 disabled:opacity-50 transition-colors"
                              title="Reset password"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => startEdit(userItem)}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                              title="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(userItem.id, userItem.username)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserManagement;