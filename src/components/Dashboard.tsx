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
  Clock,
  Folder,
  Globe,
  Lock,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle as AlertCircleIcon,
  X,
  Terminal
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
  const [showPasswordAlert, setShowPasswordAlert] = React.useState(false);

  // Check password expiration - show warning 15 days before expiration
  React.useEffect(() => {
    if (user && user.role !== 'superadmin' && user.passwordExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(user.passwordExpiresAt);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Show alert if password expires in 15 days or less, or is already expired
      if (daysUntilExpiry <= 15) {
        setShowPasswordAlert(true);
      }
    }
  }, [user]);
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
    console.log('Getting count for category:', category);
    console.log('Available IP entries:', ipEntries.length);
    console.log('Sample entry:', ipEntries[0]);
    
    const count = ipEntries.filter(entry => {
      const matches = entry.category === category || 
                     (entry as any).category_id === category ||
                     (entry as any).categoryId === category;
      if (matches) {
        console.log('Found matching entry:', entry);
      }
      return matches;
    }).length;
    
    console.log('Category', category, 'count:', count);
    return count;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden">
      {/* Cybersecurity Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(0,255,255,0.05)_25%,rgba(0,255,255,0.05)_26%,transparent_27%,transparent_74%,rgba(0,255,255,0.05)_75%,rgba(0,255,255,0.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(0,255,255,0.05)_25%,rgba(0,255,255,0.05)_26%,transparent_27%,transparent_74%,rgba(0,255,255,0.05)_75%,rgba(0,255,255,0.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
      </div>

      {/* Floating Security Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 animate-float">
          <Shield className="h-6 w-6 text-cyan-400 opacity-20" />
        </div>
        <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: '1s' }}>
          <Terminal className="h-5 w-5 text-green-400 opacity-20" />
        </div>
        <div className="absolute bottom-40 left-20 animate-float" style={{ animationDelay: '2s' }}>
          <Zap className="h-6 w-6 text-yellow-400 opacity-20" />
        </div>
        <div className="absolute bottom-20 right-10 animate-float" style={{ animationDelay: '3s' }}>
          <Globe className="h-6 w-6 text-blue-400 opacity-20" />
        </div>
      </div>

      {/* Header */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-cyan-500/20 shadow-2xl relative z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-wrap justify-between items-center min-h-16 py-2">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-pulse opacity-75"></div>
                <Shield className="h-8 w-8 text-cyan-400 relative z-10" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text hidden sm:block font-mono">
                THREAT RESPONSE
              </h1>
              <h1 className="text-lg font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text sm:hidden font-mono">
                TR
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm text-cyan-200 order-last sm:order-first w-full sm:w-auto text-center sm:text-left font-mono">
                Welcome, <span className="font-medium text-cyan-300">{user?.username}</span>
                <span className="ml-2 px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs border border-cyan-500/30">
                  {user?.role}
                </span>
              </div>
              
              <div className="text-xs text-cyan-400 hidden lg:block font-mono">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </div>
              
              {/* Action Buttons - Responsive Layout */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                {(user?.role === 'superadmin' || user?.role === 'soc_admin') && (
                  <>
                    <button
                      onClick={handleAbuseIPDBSync}
                      disabled={syncing}
                      className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all duration-300 disabled:opacity-50 border border-purple-500/30"
                      title="Sync with AbuseIPDB (80%+ confidence)"
                    >
                      <Download className={`h-3 w-3 sm:h-4 sm:w-4 ${syncing ? 'animate-bounce' : ''}`} />
                      <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync AbuseIPDB'}</span>
                      <span className="sm:hidden">ADB</span>
                    </button>
                    
                    <button
                      onClick={handleVirusTotalSync}
                      disabled={syncingVT}
                      className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg transition-all duration-300 disabled:opacity-50 border border-green-500/30"
                      title="Sync with VirusTotal (80%+ malicious)"
                    >
                      <Download className={`h-3 w-3 sm:h-4 sm:w-4 ${syncingVT ? 'animate-bounce' : ''}`} />
                      <span className="hidden sm:inline">{syncingVT ? 'Syncing VT...' : 'Sync VirusTotal'}</span>
                      <span className="sm:hidden">VT</span>
                    </button>
                    
                    <button
                      onClick={handleUpdateSources}
                      disabled={updating}
                      className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg transition-all duration-300 disabled:opacity-50 border border-indigo-500/30"
                      title="Update source IP intelligence"
                    >
                      <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${updating ? 'animate-spin' : ''}`} />
                      <span className="hidden lg:inline">{updating ? 'Updating...' : 'Update Sources'}</span>
                      <span className="lg:hidden">Update</span>
                    </button>
                    
                    <button
                      onClick={handleBulkExtract}
                      disabled={extracting}
                      className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg transition-all duration-300 disabled:opacity-50 border border-emerald-500/30"
                      title="Extract IPs from sources to categories"
                    >
                      <TrendingUp className={`h-3 w-3 sm:h-4 sm:w-4 ${extracting ? 'animate-bounce' : ''}`} />
                      <span className="hidden lg:inline">{extracting ? 'Extracting...' : 'Extract Sources'}</span>
                      <span className="lg:hidden">Extract</span>
                    </button>
                  </>
                )}
                
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1 sm:p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors border border-cyan-500/30"
                  title="Refresh data"
                >
                  <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                
                {/* Dropdown Menu for smaller screens */}
                <div className="relative group">
                  <button className="p-1 sm:p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors border border-cyan-500/30">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-xl rounded-lg shadow-2xl border border-cyan-500/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      <button 
                        onClick={() => window.location.hash = '/change-password'}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10 transition-colors"
                      >
                        <Lock className="h-4 w-4" />
                        <span>Change Password</span>
                      </button>
                      
                      {user?.role === 'superadmin' && (
                        <>
                          <button
                            onClick={() => window.open('#/users', '_self')}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10 transition-colors"
                          >
                            <User className="h-4 w-4" />
                            <span>User Management</span>
                          </button>
                          
                          <button
                            onClick={() => window.open('#/categories', '_self')}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10 transition-colors"
                          >
                            <Settings className="h-4 w-4" />
                            <span>Category Management</span>
                          </button>
                          
                          <button
                            onClick={() => window.open('#/expiration', '_self')}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10 transition-colors"
                          >
                            <Clock className="h-4 w-4" />
                            <span>Expiration Management</span>
                          </button>
                        </>
                      )}
                      
                      <div className="border-t border-cyan-500/30 my-1"></div>
                      
                      <button
                        onClick={logout}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Password Expiration Alert */}
        {showPasswordAlert && user && user.passwordExpiresAt && user.role !== 'superadmin' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  {(() => {
                    const now = new Date();
                    const expiresAt = new Date(user.passwordExpiresAt);
                    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <>
                  <h3 className="text-sm font-semibold text-yellow-800">
                        {daysUntilExpiry < 0 ? 'Password Expired' : 'Password Expiring Soon'}
                  </h3>
                  <p className="text-sm text-yellow-700">
                        {daysUntilExpiry < 0 
                          ? `Your password expired ${Math.abs(daysUntilExpiry)} days ago. Please change it immediately.`
                          : daysUntilExpiry === 0
                      ? 'Your password expires today. Please change it now.'
                            : `Your password will expire in ${daysUntilExpiry} days.`
                    }
                  </p>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.location.hash = '/change-password'}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  Change Password
                </button>
                <button
                  onClick={() => setShowPasswordAlert(false)}
                  className="p-2 text-yellow-600 hover:text-yellow-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-2 font-mono">IP Category Management</h2>
          <p className="text-cyan-200">
            Manage malicious IP addresses from multiple sources and generate EDL feeds for Palo Alto firewalls{CONFIG.isNetlify ? ' (Demo Mode)' : ''}
          </p>
          <div className="mt-2 flex items-center space-x-4 text-sm text-cyan-300 font-mono">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8 relative z-10">
          {activeCategories.map((category) => (
            <div
              key={category.id}
              className={`bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-4 sm:p-6 hover:shadow-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 ${
                !canAccessCategory(category.id) ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${category.color} text-white`}>
                  {getCategoryIcon(category)}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-300 font-mono">
                    {getCategoryCount(category.id)}
                  </div>
                  <div className="text-sm text-cyan-400">entries</div>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-cyan-200 mb-2 font-mono">
                {category.label}
              </h3>
              <p className="text-sm text-cyan-300 mb-4">
                {category.description}
              </p>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => window.location.hash = `/list/${category.id}`}
                  className="flex-1 px-2 sm:px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs sm:text-sm rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center justify-center space-x-1 border border-blue-500/30"
                  disabled={!canAccessCategory(category.id)}
                >
                  <Eye className="h-4 w-4" />
                  <span>View</span>
                </button>
                
                <button
                  onClick={() => window.location.hash = `/edl/${category.name}`}
                  className="px-2 sm:px-3 py-2 bg-green-500/20 text-green-400 text-xs sm:text-sm rounded-lg hover:bg-green-500/30 transition-colors flex items-center justify-center border border-green-500/30"
                  title="View EDL Feed Link"
                >
                  <span className="text-xs">EDL</span>
                </button>
                
                <button
                  onClick={() => window.open(`https://threatresponse.ndbbank.com/api/edl/${category.name}`, '_blank')}
                  className="px-2 sm:px-3 py-2 bg-gray-500/20 text-gray-400 text-xs sm:text-sm rounded-lg hover:bg-gray-500/30 transition-colors flex items-center justify-center border border-gray-500/30"
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
          <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-green-500 text-white">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-200 font-mono">Whitelist Management</h3>
                  <p className="text-sm text-cyan-300">
                    Protected IPs excluded from all threat categories
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-300 font-mono">
                  {whitelistEntries.length}
                </div>
                <div className="text-sm text-cyan-400">whitelisted</div>
              </div>
            </div>
            
            <button
              onClick={() => window.open('#/whitelist', '_self')}
              className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 flex items-center justify-center space-x-2 border border-green-500/30"
            >
              <Eye className="h-4 w-4" />
              <span>Manage Whitelist</span>
            </button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 relative z-10">
          <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-cyan-300 font-mono">Total Malicious Entries</p>
                <p className="text-2xl font-bold text-cyan-200 font-mono">{ipEntries.length}</p>
                <p className="text-xs text-cyan-400 mt-1">
                  IPs, Hostnames & FQDNs | Manual: {sourceStats.manual} | AbuseIPDB: {sourceStats.abuseipdb} | VT: {sourceStats.virustotal}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 text-red-600">
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </div>
          
          <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-cyan-300 font-mono">Whitelisted Entries</p>
                <p className="text-2xl font-bold text-cyan-200 font-mono">{whitelistEntries.length}</p>
                <p className="text-xs text-cyan-400 mt-1">IPs, Hostnames & FQDNs protected from all sources</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </div>
          
          <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-cyan-300 font-mono">Active Categories</p>
                <p className="text-2xl font-bold text-cyan-200 font-mono">{activeCategories.length}</p>
                <p className="text-xs text-cyan-400 mt-1">Threat classification categories</p>
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