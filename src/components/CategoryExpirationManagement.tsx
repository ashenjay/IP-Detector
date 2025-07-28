import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCategory } from '../contexts/CategoryContext';
import { 
  Clock, 
  ArrowLeft,
  Calendar,
  Shield,
  AlertCircle,
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
  Eye,
  Folder,
  Save,
  RotateCcw,
  CheckCircle,
  XCircle
} from 'lucide-react';

const CategoryExpirationManagement: React.FC = () => {
  const { user } = useAuth();
  const { categories, updateCategory, refreshCategories } = useCategory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [fixingSchema, setFixingSchema] = useState(false);
  const [expirationSettings, setExpirationSettings] = useState<{[key: string]: {
    expirationDays: number | null;
    autoCleanup: boolean;
  }}>({});

  // Auto-refresh every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(async () => {
      console.log('Auto-refreshing expiration data...');
      await refreshCategories();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshCategories]);

  // Initialize expiration settings from categories
  React.useEffect(() => {
    const settings: {[key: string]: {expirationDays: number | null; autoCleanup: boolean}} = {};
    categories.forEach(category => {
      settings[category.id] = {
        expirationDays: category.expirationDays || null,
        autoCleanup: category.autoCleanup || false
      };
    });
    setExpirationSettings(settings);
  }, [categories]);

  const handleFixSchema = async () => {
    setFixingSchema(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('https://threatresponse.ndbbank.com/api/test/create-columns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSuccess('Database schema updated successfully! You can now configure expiration settings.');
        console.log('Schema fix result:', result);
      } else {
        setError('Failed to update database schema: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Schema fix error:', err);
      setError('Error updating database schema: ' + err.message);
    } finally {
      setFixingSchema(false);
    }
  };

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

  const handleUpdateExpiration = async (categoryId: string) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const settings = expirationSettings[categoryId];
      if (!settings) {
        setError('Invalid category settings');
        return;
      }

      console.log('Updating expiration for category:', categoryId);
      console.log('Settings to update:', settings);

      const success = await updateCategory(categoryId, {
        expirationDays: settings.expirationDays,
        autoCleanup: settings.autoCleanup
      });

      console.log('Update result:', success);

      if (success) {
        setSuccess('Expiration settings updated successfully!');
        setEditingCategory(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to update expiration settings');
      }
    } catch (err) {
      console.error('Update expiration error:', err);
      setError('Error updating expiration settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExpirationChange = (categoryId: string, days: number | null) => {
    setExpirationSettings(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        expirationDays: days,
        autoCleanup: days !== null && days > 0 // Auto-enable cleanup when days are set
      }
    }));
  };

  const handleAutoCleanupChange = (categoryId: string, autoCleanup: boolean) => {
    setExpirationSettings(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        autoCleanup
      }
    }));
  };

  const resetCategorySettings = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setExpirationSettings(prev => ({
        ...prev,
        [categoryId]: {
          expirationDays: category.expirationDays || null,
          autoCleanup: category.autoCleanup || false
        }
      }));
    }
  };

  const getExpirationStatus = (category: any) => {
    const settings = expirationSettings[category.id];
    if (!settings || !settings.expirationDays) {
      return { text: 'No expiration', color: 'bg-gray-100 text-gray-800', icon: null };
    }

    if (settings.autoCleanup) {
      return { 
        text: `Auto-cleanup: ${settings.expirationDays} days`, 
        color: 'bg-green-100 text-green-800',
        icon: <RotateCcw className="h-3 w-3" />
      };
    } else {
      return { 
        text: `${settings.expirationDays} days (manual)`, 
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-3 w-3" />
      };
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only superadmins can access expiration management.</p>
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
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500 text-white rounded-lg">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Category Expiration Management</h1>
                  <p className="text-sm text-gray-600">Configure automatic IP cleanup and expiration settings</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                {categories.length} categories
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
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

        {success && (
          <div className="mb-6 flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Temporary Schema Fix Button */}
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Database Schema Fix</h3>
              <p className="text-sm text-yellow-700">
                If expiration settings are not working, click this button to update the database schema.
              </p>
            </div>
            <button
              onClick={handleFixSchema}
              disabled={fixingSchema}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>{fixingSchema ? 'Fixing Schema...' : 'Fix Database Schema'}</span>
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Expiration Settings</h3>
              <p className="text-sm text-blue-700">Configure how long IP entries remain in each category</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-green-600" />
              <span><strong>Auto-cleanup:</strong> IPs are automatically removed when expired</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span><strong>Manual cleanup:</strong> IPs expire but require manual removal</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              <span><strong>No expiration:</strong> IPs remain indefinitely</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span><strong>Range:</strong> 1-31 days expiration period</span>
            </div>
          </div>
        </div>

        {/* Categories Expiration List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Category Expiration Settings</h3>
            <p className="text-sm text-gray-600 mt-1">Configure expiration and auto-cleanup for each category</p>
          </div>

          <div className="divide-y divide-gray-200">
            {categories.map((category) => {
              const settings = expirationSettings[category.id] || { expirationDays: null, autoCleanup: false };
              const status = getExpirationStatus(category);
              const isEditing = editingCategory === category.id;

              return (
                <div key={category.id} className="p-6">
                  <div className="flex items-center justify-between">
                    {/* Category Info */}
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${category.color} text-white`}>
                        {React.createElement(getIconComponent(category.icon), { className: "h-5 w-5" })}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">{category.label}</h4>
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.icon}
                            <span>{status.text}</span>
                          </span>
                          {category.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{category.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {category.ipCount || 0} IP entries • Created by {category.createdBy || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {!isEditing ? (
                        <button
                          onClick={() => setEditingCategory(category.id)}
                          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Configure</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleUpdateExpiration(category.id)}
                            disabled={loading}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            <Save className="h-4 w-4" />
                            <span>{loading ? 'Saving...' : 'Save'}</span>
                          </button>
                          <button
                            onClick={() => {
                              resetCategorySettings(category.id);
                              setEditingCategory(null);
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expiration Settings Form */}
                  {isEditing && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Expiration Days */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiration Period
                          </label>
                          <div className="space-y-2">
                            <select
                              value={settings.expirationDays || ''}
                              onChange={(e) => handleExpirationChange(category.id, e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                              <option value="">No expiration</option>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>
                                  {day} day{day !== 1 ? 's' : ''}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500">
                              IP entries will expire after this period from their creation date
                            </p>
                          </div>
                        </div>

                        {/* Auto Cleanup */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cleanup Method
                          </label>
                          <div className="space-y-3">
                            <label className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name={`cleanup-${category.id}`}
                                checked={settings.autoCleanup}
                                onChange={() => handleAutoCleanupChange(category.id, true)}
                                disabled={!settings.expirationDays}
                                className="text-orange-600 focus:ring-orange-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-900">Automatic Cleanup</span>
                                <p className="text-xs text-gray-500">Expired IPs are automatically removed</p>
                              </div>
                            </label>
                            <label className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name={`cleanup-${category.id}`}
                                checked={!settings.autoCleanup}
                                onChange={() => handleAutoCleanupChange(category.id, false)}
                                className="text-orange-600 focus:ring-orange-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-900">Manual Cleanup</span>
                                <p className="text-xs text-gray-500">Expired IPs require manual removal</p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Preview */}
                      {settings.expirationDays && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-2 text-blue-800">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm font-medium">Preview:</span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            IP entries in "{category.label}" will expire after {settings.expirationDays} day{settings.expirationDays !== 1 ? 's' : ''} 
                            {settings.autoCleanup ? ' and be automatically removed' : ' but require manual removal'}.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CategoryExpirationManagement;