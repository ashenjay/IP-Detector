import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCategory } from '../contexts/CategoryContext';
import { useIP } from '../contexts/IPContext';
import { CONFIG, getEnvironmentMessage } from '../config/environment';
import { 
  Shield, 
  Bug, 
  Mail, 
  Server, 
  Zap, 
  Eye,
  LogOut,
  RefreshCw,
  ExternalLink,
  Download,
  Database,
  TrendingUp,
  User,
  Settings,
  Folder,
  Globe,
  Lock,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle as AlertCircleIcon,
  X
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { categories } = useCategory();
  const { ipEntries, whitelistEntries, refreshData, syncAbuseIPDB, syncVirusTotal, updateSourceIPs, bulkExtractFromSources } = useIP();
  const [refreshing, setRefreshing] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [syncingVT, setSyncingVT] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [extracting, setExtracting] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState(new Date());
  const [showEnvironmentInfo, setShowEnvironmentInfo] = React.useState(true);

  const environmentMessage = getEnvironmentMessage();

  // Auto-refresh every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(async () => {
      console.log('Auto-refreshing data...');
      await refreshData();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setLastRefresh(new Date());
    setRefreshing(false);
  };

  const handleAbuseIPDBSync = async () => {
    setSyncing(true);
    try {
      await syncAbuseIPDB();
      await refreshData(); // Refresh to show new data
    } catch (error) {
      alert('Failed to sync with AbuseIPDB. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleVirusTotalSync = async () => {
    setSyncingVT(true);
    try {
      await syncVirusTotal();
      await refreshData(); // Refresh to show new data
    } catch (error) {
      alert('Failed to sync with VirusTotal. Please try again.');
    } finally {
      setSyncingVT(false);
    }
  };

  const handleUpdateSources = async () => {
    setUpdating(true);
    try {
      await updateSourceIPs();
      await refreshData(); // Refresh to show updated data
    } catch (error) {
      alert('Failed to update source IPs. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkExtract = async () => {
    setExtracting(true);
    try {
      await bulkExtractFromSources();
      await refreshData(); // Refresh to show updated data
    } catch (error) {
      alert('Failed to extract IPs from sources. Please try again.');
    } finally {
      setExtracting(false);
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
  
  const getCategoryIcon = (category: any) => {
    const IconComponent = getIconComponent(category.icon);
    return <IconComponent className="h-6 w-6" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'malware': return 'bg-red-500';
      case 'phishing': return 'bg-orange-500';
      case 'c2': return 'bg-purple-500';
      case 'bruteforce': return 'bg-yellow-500';
      case 'sources': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryCount = (category: string) => {
    // First try to get count from category object (from database)
    const categoryObj = categories.find(cat => cat.id === category || cat.name === category);
    if (categoryObj && categoryObj.ipCount !== undefined) {
      return categoryObj.ipCount;
    }
    
    return 0;
  };

  const activeCategories = categories.filter(cat => cat.isActive);

  const canAccessCategory = (category: string) => {
    if (user?.role === 'superadmin') return true;
    if (user?.role === 'soc_admin') return user.assignedCategories?.includes(category) || false;
    return true; // viewers can view all
  };

  const getSourceStats = () => {
    const manual = ipEntries.filter(entry => entry.source === 'manual').length;
    const abuseipdb = ipEntries.filter(entry => entry.source === 'abuseipdb').length;
    const virustotal = ipEntries.filter(entry => entry.source === 'virustotal').length;
    return { manual, abuseipdb, virustotal };
  };

  const sourceStats = getSourceStats();
  
  const formatExpirationTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    
    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Abuse IP Detector</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{user?.username}</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {user?.role}
                </span>
              </div>
              
              <div className="text-xs text-gray-500">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </div>
              
              {(user?.role === 'superadmin' || user?.role === 'soc_admin') && (
                <button
                  onClick={handleAbuseIPDBSync}
                  disabled={syncing}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Sync with AbuseIPDB (80%+ confidence)"
                >
                  <Download className={`h-4 w-4 ${syncing ? 'animate-bounce' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync AbuseIPDB'}</span>
                </button>
              )}
              
              {(user?.role === 'superadmin' || user?.role === 'soc_admin') && (
                <button
                  onClick={handleVirusTotalSync}
                  disabled={syncingVT}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Sync with VirusTotal (80%+ malicious)"
                >
                  <Download className={`h-4 w-4 ${syncingVT ? 'animate-bounce' : ''}`} />
                  <span>{syncingVT ? 'Syncing VT...' : 'Sync VirusTotal'}</span>
                </button>
              )}
              
              {(user?.role === 'superadmin' || user?.role === 'soc_admin') && (
                <button
                  onClick={handleUpdateSources}
                  disabled={updating}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Update source IP intelligence"
                >
                  <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                  <span>{updating ? 'Updating...' : 'Update Sources'}</span>
                </button>
              )}
              
              {(user?.role === 'superadmin' || user?.role === 'soc_admin') && (
                <button
                  onClick={handleBulkExtract}
                  disabled={extracting}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Extract IPs from sources to categories"
                >
                  <TrendingUp className={`h-4 w-4 ${extracting ? 'animate-bounce' : ''}`} />
                  <span>{extracting ? 'Extracting...' : 'Extract Sources'}</span>
                </button>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
              
              {user?.role === 'superadmin' && (
                <button
                  onClick={() => window.open('#/users', '_self')}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Users</span>
                </button>
              )}
              
              {user?.role === 'superadmin' && (
                <button
                  onClick={() => window.open('#/categories', '_self')}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Categories</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">IP Category Management</h2>
          <p className="text-gray-600">
            Manage malicious IP addresses from multiple sources and generate EDL feeds for Palo Alto firewalls{CONFIG.isNetlify ? ' (Demo Mode)' : ''}
          </p>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Manual: {sourceStats.manual}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>AbuseIPDB: {sourceStats.abuseipdb}{CONFIG.isNetlify ? ' (Demo)' : ''}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>VirusTotal: {sourceStats.virustotal}{CONFIG.isNetlify ? ' (Demo)' : ''}</span>
            </div>
            {CONFIG.isNetlify && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Demo Environment</span>
              </div>
            )}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {activeCategories.map((category) => (
            <div
              key={category.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
                !canAccessCategory(category.id) ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${category.color} text-white`}>
                  {getCategoryIcon(category)}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {getCategoryCount(category.id)}
                  </div>
                  <div className="text-sm text-gray-500">entries</div>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {category.label}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {category.description}
              </p>
              
              {/* ONLY show expiration info if auto-cleanup is enabled */}
              {category.autoCleanup ? (
                <div className="mb-4 p-2 rounded-lg bg-gray-50 border">
                  <div className="text-xs text-gray-700 space-y-1">
                    <div><strong>🔄 Auto-removal:</strong> Enabled</div>
                    {category.expirationHours && category.expirationHours > 0 ? (
                      <div className="text-orange-600 font-medium">
                        ⏰ IP entries expire after {formatExpirationTime(category.expirationHours * 3600)}
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        ⏰ No expiration time set
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    console.log('🔍 Dashboard View button clicked for category:', category.id, category.name);
                    window.location.href = `#/list/${category.id}`;
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                  disabled={!canAccessCategory(category.id)}
                >
                  <Eye className="h-4 w-4" />
                  <span>View</span>
                </button>
                
                <button
                  onClick={() => window.location.hash = `/edl/${category.name}`}
                  className="px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center"
                  title="View EDL Feed Link"
                >
                  <span className="text-xs">EDL</span>
                </button>
                
                <button
                  onClick={() => window.open(`https://threatresponse.ndbbank.com/api/edl/${category.name}`, '_blank')}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  title="Plain Text EDL"
                >
                  <span className="text-xs">TXT</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Whitelist Section */}
        {user?.role === 'superadmin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-green-500 text-white">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Whitelist Management</h3>
                  <p className="text-sm text-gray-600">
                    Protected IPs excluded from all threat categories
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {whitelistEntries.length}
                </div>
                <div className="text-sm text-gray-500">whitelisted</div>
              </div>
            </div>
            
            <button
              onClick={() => window.open('#/whitelist', '_self')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>Manage Whitelist</span>
            </button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Malicious Entries</p>
                <p className="text-2xl font-bold text-gray-900">{ipEntries.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  IPs, Hostnames & FQDNs | Manual: {sourceStats.manual} | AbuseIPDB: {sourceStats.abuseipdb} | VT: {sourceStats.virustotal}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 text-red-600">
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Whitelisted Entries</p>
                <p className="text-2xl font-bold text-gray-900">{whitelistEntries.length}</p>
                <p className="text-xs text-gray-500 mt-1">IPs, Hostnames & FQDNs protected from all sources</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Categories</p>
                <p className="text-2xl font-bold text-gray-900">{activeCategories.length}</p>
                <p className="text-xs text-gray-500 mt-1">Threat classification categories</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <Settings className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;