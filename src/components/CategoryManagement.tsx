import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCategory } from '../contexts/CategoryContext';
import { 
  Folder, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Calendar,
  Shield,
  Eye,
  EyeOff,
  Save,
  X,
  AlertCircle,
  Palette,
  Tag,
  FileText,
  Settings,
  User,
  Bug,
  Mail,
  Server,
  Zap,
  Database,
  Globe,
  Lock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const CategoryManagement: React.FC = () => {
  const { user } = useAuth();
  const { categories, createCategory, updateCategory, deleteCategory, toggleCategoryStatus, refreshCategories } = useCategory();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [migrationTarget, setMigrationTarget] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(async () => {
      console.log('Auto-refreshing category data...');
      await refreshCategories();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshCategories]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    description: '',
    color: 'bg-blue-500',
    icon: 'Shield',
    expiresAt: '',
    autoCleanup: false
  });

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      description: '',
      color: 'bg-blue-500',
      icon: 'Shield',
      expiresAt: '',
      autoCleanup: false
    });
    setError('');
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Creating category with form data:', formData);
      
      const categoryData = {
        ...formData,
        isActive: true,
        // Categories automatically get 24h expiration from creation time
        autoCleanup: true
      };
      
      console.log('Sending category data:', categoryData);
      
      const success = await createCategory(categoryData);
      
      if (success) {
        resetForm();
        setShowCreateForm(false);
      } else {
        setError('Failed to create category. Name may already exist.');
      }
    } catch (err) {
      console.error('Create category error:', err);
      setError('Error creating category');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    setError('');
    setLoading(true);

    try {
      console.log('Updating category with form data:', formData);
      
      const updateData = {
        ...formData,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
        autoCleanup: formData.autoCleanup || false
      };
      
      console.log('Sending update data:', updateData);
      
      const success = await updateCategory(categoryId, updateData);
      if (success) {
        setShowEditForm(false);
        setEditingCategory(null);
        resetForm();
      } else {
        setError('Failed to update category. Name may already exist.');
      }
    } catch (err) {
      console.error('Update category error:', err);
      setError('Error updating category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setLoading(true);
    try {
      const success = await deleteCategory(categoryId, migrationTarget || undefined);
      if (success) {
        setShowDeleteModal(null);
        setMigrationTarget('');
      } else {
        setError('Failed to delete category');
      }
    } catch (err) {
      setError('Error deleting category');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (categoryId: string) => {
    setLoading(true);
    try {
      const success = await toggleCategoryStatus(categoryId);
      if (!success) {
        setError('Failed to toggle category status');
      }
    } catch (err) {
      setError('Error toggling category status');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCleanup = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('https://threatresponse.ndbbank.com/api/categories/cleanup-expired', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        await refreshCategories();
        setError(`Cleanup completed! Removed ${result.cleanedEntries} IP entries from expired categories.`);
        setTimeout(() => setError(''), 5000);
      } else {
        setError('Failed to cleanup expired categories');
      }
    } catch (err) {
      setError('Error during cleanup');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendExpiration = async (categoryId: string, newExpiration: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`https://threatresponse.ndbbank.com/api/categories/${categoryId}/extend-expiration`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newExpiration: newExpiration
        })
      });

      if (response.ok) {
        await refreshCategories();
        setError('Category expiration extended successfully!');
        setTimeout(() => setError(''), 3000);
      } else {
        setError('Failed to extend category expiration');
      }
    } catch (err) {
      setError('Error extending category expiration');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (category: any) => {
    setFormData({
      name: category.name,
      label: category.label,
      description: category.description,
      color: category.color,
      icon: category.icon,
      expiresAt: category.expiresAt ? new Date(category.expiresAt).toISOString().slice(0, 16) : '',
      autoCleanup: category.autoCleanup || false
    });
    setEditingCategory(category);
    setShowEditForm(true);
    setError('');
  };

  const cancelEdit = () => {
    setShowEditForm(false);
    setEditingCategory(null);
    resetForm();
  };

  const colorOptions = [
    'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
    'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
    'bg-gray-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-rose-500'
  ];

  const iconOptions = [
    'Shield', 'Bug', 'Mail', 'Server', 'Zap', 'Database',
    'Globe', 'Lock', 'AlertTriangle', 'Eye', 'Settings', 'Folder'
  ];

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      Shield,
      Bug,
      Mail,
      Server,
      Zap,
      Database,
      Globe,
      Lock,
      AlertTriangle,
      Eye,
      Settings,
      Folder
    };
    return iconMap[iconName] || Shield;
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only superadmins can access category management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.hash = '/'}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Category Management</h1>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {categories.length} categories
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Category</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Create Category Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., ransomware"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Label *
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Ransomware IPs"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this category"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg ${color} ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {iconOptions.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Expiration Settings */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">⏰ Expiration Settings (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty for no expiration
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.autoCleanup}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoCleanup: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Auto-remove expired IP entries</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Category'}
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

        {/* Edit Category Form */}
        {showEditForm && editingCategory && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Category: {editingCategory.label}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateCategory(editingCategory.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., ransomware"
                    disabled={editingCategory.isDefault}
                    required
                  />
                  {editingCategory.isDefault && (
                    <p className="text-xs text-gray-500 mt-1">Default category name cannot be changed</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Label *
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Ransomware IPs"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this category"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg ${color} ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {iconOptions.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Expiration Settings */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">⏰ Expiration Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty for no expiration
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.autoCleanup}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoCleanup: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Auto-remove expired IP entries</span>
                    </label>
                  </div>
                </div>
                {editingCategory.expiresAt && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-700">
                      <div><strong>Current:</strong> {new Date(editingCategory.expiresAt).toLocaleString()}</div>
                      <div><strong>Status:</strong> {editingCategory.expirationStatus}</div>
                      {editingCategory.daysUntilExpiration && (
                        <div><strong>Time left:</strong> {Math.ceil(editingCategory.daysUntilExpiration)} days</div>
                        {category.autoCleanup && category.expirationHours && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 mt-1">
                            ⏰ Auto-remove: {category.expirationHours}h
                          </span>
                        )}
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Updating...' : 'Update Category'}
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

        {/* Categories List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${category.color} text-white`}>
                          {React.createElement(getIconComponent(category.icon), { className: "h-4 w-4" })}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{category.label}</div>
                          <div className="text-xs text-gray-500">/{category.name}</div>
                          {category.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{category.description}</div>
                      {category.expiresAt && (
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            category.expirationStatus === 'Expired' ? 'bg-red-100 text-red-800' :
                            category.expirationStatus === 'Active' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {category.expirationStatus === 'Expired' ? '🔴 Expired - IPs auto-removed' :
                             category.expirationStatus === 'Active' ? `⏰ ${Math.ceil(category.daysUntilExpiration || 0)} days left` :
                             'Never expires'}
                          </span>
                          {category.autoCleanup && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              🔄 Auto-remove IPs
                            </span>
                          )}
                        </div>
                      )}
                      {category.ipCount !== undefined && (
                        <div className="mt-1 text-xs text-gray-500">
                          {category.ipCount} IP entries
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {category.expirationStatus === 'Expired' && category.autoCleanup && (
                          <button
                            onClick={() => handleExtendExpiration(category.id, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())}
                            disabled={loading}
                            className="text-orange-600 hover:text-orange-700 disabled:opacity-50 transition-colors"
                            title="Extend expiration by 30 days"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                        )}
                        {!category.isDefault && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(category.id)}
                              disabled={loading}
                              className={`${
                                category.isActive 
                                  ? 'text-red-600 hover:text-red-700' 
                                  : 'text-green-600 hover:text-green-700'
                              } disabled:opacity-50 transition-colors`}
                              title={category.isActive ? 'Deactivate category' : 'Activate category'}
                            >
                              {category.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => startEdit(category)}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                              title="Edit category"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(category.id)}
                              className="text-red-600 hover:text-red-700 transition-colors"
                              title="Delete category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {category.isDefault && (
                          <button
                            onClick={() => startEdit(category)}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                            title="Edit category description and appearance"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Category
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this category? This action cannot be undone.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Migrate existing IPs to: (Optional)
                </label>
                <select
                  value={migrationTarget}
                  onChange={(e) => setMigrationTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Delete IPs (not recommended)</option>
                  {categories
                    .filter(c => c.id !== showDeleteModal && c.isActive)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleDeleteCategory(showDeleteModal)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete Category'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(null);
                    setMigrationTarget('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CategoryManagement;