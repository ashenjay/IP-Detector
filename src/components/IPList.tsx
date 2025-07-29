import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useIP } from '../contexts/IPContext';
import { useCategory } from '../contexts/CategoryContext';
import { virusTotalService } from '../services/serviceFactory';
import { 
  Plus, 
  Search, 
  Trash2, 
  ArrowLeft,
  Calendar,
  User,
  Filter,
  Shield,
  Database,
  Globe,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface IPListProps {
  category?: string;
  isWhitelist?: boolean;
}

const IPList: React.FC<IPListProps> = ({ category, isWhitelist = false }) => {
  const { user } = useAuth();
  const { ipEntries, whitelistEntries, addIP, deleteIP, addToWhitelist, removeFromWhitelist, checkIPReputation, extractFromSources, refreshData } = useIP();
  const { getCategoryById, refreshCategories } = useCategory();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingReputation, setCheckingReputation] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdownTimers, setCountdownTimers] = useState<{[key: string]: string}>({});

  const entries = isWhitelist ? whitelistEntries : ipEntries.filter(entry => 
    !category || entry.category === category
  );
  
  console.log('🔍 IPList: Filtered entries for category', category, ':', entries.length);

  // Auto-refresh every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(async () => {
      console.log('Auto-refreshing IP list...');
      await refreshData();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshData]);

  // Real-time countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const categoryObj = category ? getCategoryById(category) : null;
      console.log('🔍 IPList: Countdown timer update for category:', categoryObj?.name, 'autoCleanup:', categoryObj?.autoCleanup);
      
      if (categoryObj?.autoCleanup && categoryObj?.expirationHours && categoryObj.expirationHours > 0) {
        const newTimers: {[key: string]: string} = {};
        
        entries.forEach(entry => {
          const addedTime = new Date(entry.dateAdded).getTime();
          const expirationTime = addedTime + (categoryObj.expirationHours! * 1000); // Convert seconds to milliseconds
          const now = new Date().getTime();
          const timeLeft = expirationTime - now;
          
          console.log('🔍 Timer calculation for entry:', entry.id, {
            addedTime: new Date(addedTime),
            expirationTime: new Date(expirationTime),
            timeLeft: timeLeft,
            categoryExpirationSeconds: categoryObj.expirationHours
          });
          
          if (timeLeft > 0) {
            const totalSecondsLeft = Math.ceil(timeLeft / 1000);
            const hoursLeft = Math.floor(totalSecondsLeft / 3600);
            const minutesLeft = Math.floor((totalSecondsLeft % 3600) / 60);
            const secondsLeft = totalSecondsLeft % 60;
            
            const timeString = [];
            if (hoursLeft > 0) timeString.push(`${hoursLeft}h`);
            if (minutesLeft > 0) timeString.push(`${minutesLeft}m`);
            if (secondsLeft > 0) timeString.push(`${secondsLeft}s`);
            
            newTimers[entry.id] = timeString.join(' ') || '0s';
          } else {
            newTimers[entry.id] = 'EXPIRED';
          }
        });
        
        console.log('🔍 Updated timers:', newTimers);
        setCountdownTimers(newTimers);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [entries, category, getCategoryById]);

  const filteredEntries = entries.filter(entry =>
    entry.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canAdd = isWhitelist 
    ? user?.role === 'superadmin'
    : user?.role === 'superadmin' || (user?.role === 'soc_admin' && user?.assignedCategories?.includes(category!) && user?.isActive);

  const canDelete = (entry: any) => {
    if (isWhitelist) return user?.role === 'superadmin' && user?.isActive;
    return user?.role === 'superadmin' || 
           (user?.role === 'soc_admin' && user?.assignedCategories?.includes(entry.category) && user?.isActive);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIP.trim()) return;

    setLoading(true);
    try {
      let result;
      if (isWhitelist) {
        result = await addToWhitelist(newIP.trim(), newDescription.trim() || undefined);
      } else {
        result = await addIP(newIP.trim(), category!, newDescription.trim() || undefined);
        if (result.success) {
          // Refresh categories to update IP count
          await refreshCategories();
        }
      }

      if (result.success) {
        setNewIP('');
        setNewDescription('');
        setShowAddForm(false);
      } else {
        setErrorTitle('Cannot Add IP Address');
        setErrorMessage(result.message || 'Failed to add IP address');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorTitle('Error');
      setErrorMessage('An unexpected error occurred while adding the IP address. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const success = isWhitelist 
        ? await removeFromWhitelist(id)
        : await deleteIP(id);

      if (success && !isWhitelist) {
        // Refresh categories to update IP count
        await refreshCategories();
      }

      if (!success) {
        setErrorTitle('Delete Failed');
        setErrorMessage('Failed to delete the IP address. You may not have sufficient permissions.');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorTitle('Error');
      setErrorMessage('An unexpected error occurred while deleting the IP address. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckReputation = async (ip: string) => {
    setCheckingReputation(ip);
    try {
      // Check both AbuseIPDB and VirusTotal
      const abuseReputation = await checkIPReputation(ip);
      
      let vtInfo = '';
      try {
        const vtResponse = await virusTotalService.checkIP(ip);
        if (vtResponse && vtResponse.data && vtResponse.data.attributes) {
          const stats = vtResponse.data.attributes.last_analysis_stats;
          const maliciousPercentage = virusTotalService.calculateMaliciousPercentage(stats);
          vtInfo = `\n\nVirusTotal:\nMalicious: ${maliciousPercentage}%\nDetections: ${stats.malicious}/${stats.malicious + stats.harmless + stats.suspicious + stats.undetected}\nCountry: ${vtResponse.data.attributes.country || 'Unknown'}`;
        }
      } catch (error) {
        vtInfo = '\n\nVirusTotal: Failed to fetch data';
      }
      
      setErrorTitle(`IP Reputation: ${ip}`);
      setErrorMessage(`AbuseIPDB:\nAbuse Confidence: ${abuseReputation.abuseConfidencePercentage}%\nTotal Reports: ${abuseReputation.totalReports}\nCountry: ${abuseReputation.countryCode}\nISP: ${abuseReputation.isp}${vtInfo}`);
      setShowErrorModal(true);
    } catch (error) {
      setErrorTitle('Reputation Check Failed');
      setErrorMessage('Unable to retrieve IP reputation information. Please check your connection and try again.');
      setShowErrorModal(true);
    } finally {
      setCheckingReputation(null);
    }
  };

  const handleExtractSelected = async (targetCategory: string) => {
    if (selectedEntries.size === 0) return;
    
    setLoading(true);
    try {
      const success = await extractFromSources(Array.from(selectedEntries), targetCategory);
      if (success) {
        setSelectedEntries(new Set());
        setShowExtractModal(false);
        setErrorTitle('Extraction Successful');
        setErrorMessage(`Successfully extracted ${selectedEntries.size} IP addresses to the ${targetCategory} category.`);
        setShowErrorModal(true);
      } else {
        setErrorTitle('Extraction Failed');
        setErrorMessage('Failed to extract IP addresses. Please check your permissions and try again.');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorTitle('Error');
      setErrorMessage('An unexpected error occurred during extraction. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (entryId: string) => {
    const newSelection = new Set(selectedEntries);
    if (newSelection.has(entryId)) {
      newSelection.delete(entryId);
    } else {
      newSelection.add(entryId);
    }
    setSelectedEntries(newSelection);
  };

  const selectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map(entry => entry.id)));
    }
  };
  
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'abuseipdb':
        return <Database className="h-4 w-4 text-purple-600" />;
      case 'virustotal':
        return <Shield className="h-4 w-4 text-green-600" />;
      case 'manual':
        return <User className="h-4 w-4 text-blue-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'abuseipdb':
        return 'AbuseIPDB';
      case 'virustotal':
        return 'VirusTotal';
      case 'manual':
        return 'Manual';
      default:
        return 'Unknown';
    }
  };

  const categoryObj = category ? getCategoryById(category) : null;
  const title = isWhitelist ? 'Whitelist Management' : categoryObj ? `${categoryObj.label}` : 'IP Addresses';

  // Check if user can access this category
  const canAccessCategory = (categoryId: string) => {
    if (user?.role === 'superadmin') return true;
    if (user?.role === 'soc_admin') return user.assignedCategories?.includes(categoryId) || false;
    return true; // viewers can view all
  };

  if (!isWhitelist && category && categoryObj && !canAccessCategory(category)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this category.</p>
        </div>
      </div>
    );
  }

  if (!isWhitelist && category && !categoryObj) {
    console.log('🔍 IPList: Category not found:', category);
    console.log('🔍 IPList: Available categories:', categories.map(c => ({ id: c.id, name: c.name })));
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h2>
          <p className="text-gray-600">The requested category "{category}" does not exist.</p>
          <p className="text-sm text-gray-500 mt-2">Available categories: {categories.length}</p>
          <button
            onClick={() => window.location.href = '#/'}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
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
              <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text font-mono">{title}</h1>
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs border border-cyan-500/30">
                {filteredEntries.length} entries
              </span>
              {category === 'sources' && selectedEntries.size > 0 && (
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs border border-emerald-500/30">
                  {selectedEntries.size} selected
                </span>
              )}
              <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded-full text-xs border border-gray-500/30">
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {category === 'sources' && selectedEntries.size > 0 && (
                <button
                  onClick={() => setShowExtractModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 border border-emerald-500/30"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Extract Selected</span>
                </button>
              )}
              
              {canAdd && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 border border-blue-500/30"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search IPs or descriptions..."
                className="block w-full pl-10 pr-3 py-2 bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
              />
            </div>
            
            {category === 'sources' && filteredEntries.length > 0 && (
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors border border-gray-500/30"
              >
                {selectedEntries.size === filteredEntries.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
        </div>

        {/* Add IP Form */}
        {showAddForm && (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
            <h3 className="text-lg font-semibold text-cyan-200 mb-4 font-mono">
              Add New {isWhitelist ? 'Whitelist' : ''} Entry
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                  IP Address, Hostname, or FQDN
                </label>
                <input
                  type="text"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="e.g., 192.168.1.1, malicious.com, or evil.domain.com"
                  className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                  required
                />
                <p className="text-xs text-cyan-400 mt-1">
                  Supports: IPv4/IPv6 addresses, CIDR blocks, hostnames, and FQDNs
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of the threat, domain purpose, or reason for listing"
                  className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-300 border border-blue-500/30"
                >
                  {loading ? 'Adding...' : 'Add Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors border border-gray-500/30"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* IP List */}
        <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 overflow-hidden">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
              <p className="text-cyan-300 text-lg font-mono">No entries found</p>
              <p className="text-cyan-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'No IP addresses have been added yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/60">
                  <tr>
                    {category === 'sources' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider font-mono">
                        <input
                          type="checkbox"
                          checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                          onChange={selectAll}
                          className="rounded border-cyan-500/30 text-cyan-600 focus:ring-cyan-500 bg-black/50"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider font-mono">
                      IP/Hostname/FQDN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider font-mono">
                      Type
                    </th>
                    {!isWhitelist && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                    )}
                    {!isWhitelist && category === 'sources' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Threat Type
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiration
                    </th>
                    {!isWhitelist && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reputation
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Added
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      {category === 'sources' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedEntries.has(entry.id)}
                            onChange={() => toggleSelection(entry.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {entry.ip}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            (entry as any).type === 'ip' ? 'bg-blue-100 text-blue-800' :
                            (entry as any).type === 'hostname' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {(entry as any).type?.toUpperCase() || 'IP'}
                          </span>
                        </div>
                      </td>
                      {!isWhitelist && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getSourceIcon((entry as any).source)}
                            <span className="text-sm text-gray-600">
                              {getSourceLabel((entry as any).source)}
                            </span>
                          </div>
                        </td>
                      )}
                      {!isWhitelist && category === 'sources' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              (entry as any).sourceCategory === 'malware' ? 'bg-red-100 text-red-800' :
                              (entry as any).sourceCategory === 'phishing' ? 'bg-orange-100 text-orange-800' :
                              (entry as any).sourceCategory === 'c2' ? 'bg-purple-100 text-purple-800' :
                              (entry as any).sourceCategory === 'bruteforce' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {(entry as any).sourceCategory || 'Unknown'}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {entry.description || <span className="text-gray-400 italic">No description</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {categoryObj?.autoCleanup && categoryObj?.expirationHours ? (
                          <div className="text-xs">
                            {countdownTimers[entry.id] === 'EXPIRED' ? (
                              <div className="text-red-600 font-medium">
                                🔴 EXPIRED - Will be auto-removed
                              </div>
                            ) : countdownTimers[entry.id] ? (
                              <div>
                                <div className="text-gray-600">
                                  Expires in: {countdownTimers[entry.id]}
                                </div>
                                <div className="text-orange-600 font-medium">
                                  ⏰ Live countdown
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500">
                                Calculating...
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No expiration</span>
                        )}
                      </td>
                      {!isWhitelist && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {(entry as any).type === 'ip' && (entry as any).reputation ? (
                              <div className="flex items-center space-x-2">
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  (entry as any).reputation!.abuseConfidence >= 90 
                                    ? 'bg-red-100 text-red-800' 
                                    : (entry as any).reputation!.abuseConfidence >= 80
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  ADB: {(entry as any).reputation!.abuseConfidence}%
                                </div>
                                {(entry as any).reputation!.countryCode && (
                                  <span className="text-xs text-gray-500">
                                    {(entry as any).reputation!.countryCode}
                                  </span>
                                )}
                              </div>
                            ) : null}
                            
                            {(entry as any).type === 'ip' && (entry as any).vtReputation ? (
                              <div className="flex items-center space-x-2">
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  (entry as any).vtReputation!.maliciousPercentage >= 90 
                                    ? 'bg-red-100 text-red-800' 
                                    : (entry as any).vtReputation!.maliciousPercentage >= 80
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  VT: {(entry as any).vtReputation!.maliciousPercentage}%
                                </div>
                                <span className="text-xs text-gray-500">
                                  {(entry as any).vtReputation!.country}
                                </span>
                              </div>
                            ) : null}
                            
                            {(entry as any).type === 'ip' && !(entry as any).reputation && !(entry as any).vtReputation && (
                              <button
                                onClick={() => handleCheckReputation(entry.ip)}
                                disabled={checkingReputation === entry.ip}
                                className="text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                                title="Check reputation"
                              >
                                <Globe className="h-4 w-4" />
                              </button>
                            )}
                            
                            {(entry as any).type !== 'ip' && (
                              <span className="text-xs text-gray-500 italic">
                                Reputation check not available for {(entry as any).type}s
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{entry.addedBy || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {entry.dateAdded instanceof Date && !isNaN(entry.dateAdded.getTime()) 
                              ? entry.dateAdded.toLocaleDateString() + ' ' + entry.dateAdded.toLocaleTimeString()
                              : new Date(entry.dateAdded).toLocaleDateString() + ' ' + new Date(entry.dateAdded).toLocaleTimeString()
                            }
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {!isWhitelist && (entry as any).type === 'ip' && !(entry as any).reputation && (
                            <button
                              onClick={() => handleCheckReputation(entry.ip)}
                              disabled={checkingReputation === entry.ip}
                              className="text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                              title="Check reputation"
                            >
                              <Globe className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete(entry) && (
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Extract Modal */}
        {showExtractModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Extract {selectedEntries.size} IPs to Category
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Select the target category for the selected IPs. They will be moved from sources to the chosen category.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['malware', 'phishing', 'c2', 'bruteforce'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleExtractSelected(cat)}
                    disabled={loading || (user?.role === 'soc_admin' && !user?.assignedCategories?.includes(cat))}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      user?.role === 'soc_admin' && !user?.assignedCategories?.includes(cat)
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700'
                    }`}
                  >
                    <div className="text-sm font-medium capitalize">{cat}</div>
                  </button>
                ))}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowExtractModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Error/Info Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {errorTitle}
              </h3>
              
              <div className="text-gray-600 mb-6 whitespace-pre-line text-left bg-gray-50 p-4 rounded-lg">
                {errorMessage}
              </div>
              
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default IPList;