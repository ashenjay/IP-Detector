import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCategory } from '../contexts/CategoryContext';
import { useIP } from '../contexts/IPContext';
import { 
  ArrowLeft,
  Copy,
  RefreshCw,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface EDLViewProps {
  category: string;
  categoryName?: string;
}

const EDLView: React.FC<EDLViewProps> = ({ category, categoryName }) => {
  const { user } = useAuth();
  const { getCategoryById } = useCategory();
  const { getEDLList, refreshData } = useIP();
  const [edlList, setEdlList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const categoryObj = getCategoryById(category);

  const loadEDLList = async () => {
    setLoading(true);
    try {
      const list = await getEDLList(category);
      setEdlList(list);
    } catch (error) {
      console.error('Failed to load EDL list:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('Auto-refreshing EDL data...');
      await refreshData();
      await loadEDLList();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshData, loadEDLList]);

  useEffect(() => {
    loadEDLList();
  }, [category]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    await loadEDLList();
    setLastRefresh(new Date());
    setRefreshing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(edlList.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const canAccessCategory = (categoryId: string) => {
    if (user?.role === 'superadmin') return true;
    if (user?.role === 'soc_admin') return user.assignedCategories?.includes(categoryId) || false;
    return true; // viewers can view all
  };

  if (!categoryObj) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h2>
          <p className="text-gray-600">The requested category does not exist.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!canAccessCategory(category)) {
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
                <div className={`p-2 rounded-lg ${categoryObj.color} text-white`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {categoryObj.label} - EDL Feed
                  </h1>
                  <p className="text-sm text-gray-600">
                    Plain text format for Palo Alto External Dynamic List
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {edlList.length} IPs
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                disabled={edlList.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied!' : 'Copy All'}</span>
              </button>
              
              <button
                onClick={() => window.open(`#/edl/${categoryName}/plain`, '_blank')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Plain Text View</span>
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* EDL Feed URL Section */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <ExternalLink className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">EDL Feed URL</h3>
              <p className="text-sm text-blue-700">Use this URL in your Palo Alto firewall External Dynamic List configuration</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-gray-800 bg-gray-100 px-3 py-2 rounded flex-1 mr-3">
                http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/edl/{categoryName || categoryObj?.name || category}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/edl/${categoryName || categoryObj?.name || category}`)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Copy EDL URL"
              >
                <Copy className="h-4 w-4" />
                <span>Copy URL</span>
              </button>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Palo Alto Configuration:</h4>
            <ol className="text-sm text-yellow-700 space-y-1">
              <li>1. Go to <strong>Objects → External Dynamic Lists</strong></li>
              <li>2. Click <strong>Add</strong> and select <strong>IP List</strong> or <strong>Domain List</strong></li>
              <li>3. Enter a name (e.g., "{categoryObj.label}")</li>
              <li>4. Paste the URL above in the <strong>Source</strong> field</li>
              <li>5. Set refresh frequency (recommended: every hour)</li>
              <li>6. Click <strong>OK</strong> and commit the configuration</li>
            </ol>
            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
              <strong>Note:</strong> This list may contain IPs, hostnames, and FQDNs. Use appropriate list type in Palo Alto.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Info Header */}
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
            <div className="flex items-center space-x-2 text-blue-800">
              <FileText className="h-5 w-5" />
              <span className="font-medium">External Dynamic List (EDL) Format</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              This plain text format can be used directly in Palo Alto firewalls as an External Dynamic List.
              Each line contains one IP address or CIDR block.
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Loading EDL list...</span>
              </div>
            ) : edlList.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No IP addresses found</p>
                <p className="text-gray-400 text-sm">
                  Add some IP addresses to the {categoryObj.label} category to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-600 pb-4 border-b border-gray-200">
                  <span>Total IP addresses: <strong>{edlList.length}</strong></span>
                  <span>Format: Plain text (one IP per line)</span>
                </div>

                {/* Plain Text Display */}
                <div className="relative">
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto">
{edlList.join('\n')}
                  </pre>
                  
                  {/* Copy button overlay */}
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-600" />}
                  </button>
                </div>

                {/* Usage Instructions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800 mb-2">Usage Instructions:</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Copy the plain text above</li>
                    <li>• Host it on a web server accessible by your Palo Alto firewall</li>
                    <li>• Configure the URL as an External Dynamic List (IP List or Domain List) in your firewall</li>
                    <li>• The firewall will automatically fetch and update the list</li>
                    <li>• <strong>Note:</strong> This list may contain mixed content (IPs, hostnames, FQDNs)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EDLView;