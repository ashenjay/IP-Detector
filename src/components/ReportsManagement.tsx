import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config/environment';
import { 
  TrendingUp, 
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Download,
  Send,
  RefreshCw,
  BarChart3,
  Users,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

const ReportsManagement: React.FC = () => {
  const { user, users } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedUser, setSelectedUser] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        month: selectedMonth.toString()
      });
      
      if (selectedUser) {
        params.append('userId', selectedUser);
      }
      
      const response = await fetch(`${config.apiEndpoint}/reports/monthly?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        setMessage('Report generated successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Generate report error:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendReport = async () => {
    if (!reportData) {
      setError('Please generate a report first');
      return;
    }
    
    if (!recipientEmail.trim()) {
      setError('Please enter recipient email address');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiEndpoint}/reports/monthly/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
          userId: selectedUser || null,
          email: recipientEmail.trim()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage(`Report sent successfully to ${data.sentTo}!`);
        setRecipientEmail('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send report');
      }
    } catch (error) {
      console.error('Send report error:', error);
      setError('Failed to send report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const autoGenerateReport = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiEndpoint}/reports/monthly/auto-generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage(`Auto-generated report for ${data.period.monthName} ${data.period.year} sent successfully!`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to auto-generate report');
      }
    } catch (error) {
      console.error('Auto-generate report error:', error);
      setError('Failed to auto-generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only superadmins can access reports.</p>
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
              <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text font-mono">Monthly Reports</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Messages */}
        {error && (
          <div className="mb-6 flex items-center space-x-2 text-red-300 bg-red-500/20 p-4 rounded-lg border border-red-500/30">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 flex items-center space-x-2 text-green-300 bg-green-500/20 p-4 rounded-lg border border-green-500/30">
            <CheckCircle className="h-5 w-5" />
            <span>{message}</span>
          </div>
        )}

        {/* Report Generation Form */}
        <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
          <h3 className="text-lg font-semibold text-cyan-200 mb-4 font-mono flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Generate Monthly Report</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">User (Optional)</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
              >
                <option value="">All Users</option>
                {users.filter(u => u.isActive).map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-300 border border-blue-500/30 flex items-center justify-center space-x-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                <span>{loading ? 'Generating...' : 'Generate'}</span>
              </button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={autoGenerateReport}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all duration-300 border border-purple-500/30 flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>Auto-Generate Last Month</span>
            </button>
          </div>
        </div>

        {/* Send Report Form */}
        {reportData && (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
            <h3 className="text-lg font-semibold text-cyan-200 mb-4 font-mono flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Send Report via Email</span>
            </h3>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">Recipient Email</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={sendReport}
                  disabled={loading || !recipientEmail.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-all duration-300 border border-green-500/30 flex items-center space-x-2"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>{loading ? 'Sending...' : 'Send Report'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Display */}
        {reportData && (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-500/20 p-6">
            <h3 className="text-lg font-semibold text-cyan-200 mb-4 font-mono flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Report: {reportData.period.monthName} {reportData.period.year}</span>
            </h3>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span className="text-sm text-blue-300 font-mono">Total Users</span>
                </div>
                <div className="text-2xl font-bold text-blue-200 font-mono">{reportData.summary.totalUsers}</div>
              </div>
              
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-green-400" />
                  <span className="text-sm text-green-300 font-mono">Active Users</span>
                </div>
                <div className="text-2xl font-bold text-green-200 font-mono">{reportData.summary.activeUsers}</div>
              </div>
              
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                  <span className="text-sm text-purple-300 font-mono">Total Entries</span>
                </div>
                <div className="text-2xl font-bold text-purple-200 font-mono">{reportData.summary.totalEntries}</div>
              </div>
              
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-sm text-red-300 font-mono">IP Entries</span>
                </div>
                <div className="text-2xl font-bold text-red-200 font-mono">{reportData.summary.totalIpEntries}</div>
              </div>
              
              <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-cyan-400" />
                  <span className="text-sm text-cyan-300 font-mono">Whitelist</span>
                </div>
                <div className="text-2xl font-bold text-cyan-200 font-mono">{reportData.summary.totalWhitelistEntries}</div>
              </div>
            </div>
            
            {/* User Activity Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-500/20 border border-gray-500/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider font-mono border border-gray-500/30">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider font-mono border border-gray-500/30">Role</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider font-mono border border-gray-500/30">IP Entries</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider font-mono border border-gray-500/30">Whitelist</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider font-mono border border-gray-500/30">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider font-mono border border-gray-500/30">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.userActivity.map((user: any, index: number) => (
                    <tr key={user.id} className={index % 2 === 0 ? 'bg-black/20' : 'bg-black/10'}>
                      <td className="px-4 py-3 text-sm text-cyan-200 border border-gray-500/30">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-cyan-400" />
                          <span className="font-mono">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-cyan-200 border border-gray-500/30">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'superadmin' ? 'bg-red-100 text-red-800' :
                          user.role === 'soc_admin' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-cyan-200 text-center border border-gray-500/30 font-mono">{user.ip_entries_added}</td>
                      <td className="px-4 py-3 text-sm text-cyan-200 text-center border border-gray-500/30 font-mono">{user.whitelist_entries_added}</td>
                      <td className="px-4 py-3 text-sm text-cyan-200 text-center border border-gray-500/30 font-mono font-bold">{user.total_entries_added}</td>
                      <td className="px-4 py-3 text-sm text-cyan-200 border border-gray-500/30 font-mono">
                        {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : 'No activity'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportsManagement;