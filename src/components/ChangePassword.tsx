import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, Shield, Eye, EyeOff, Calendar, Clock, ArrowLeft } from 'lucide-react';

const ChangePassword: React.FC = () => {
  const { updatePassword, logout, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isForceChange = user?.mustChangePassword;
  const isSelfChange = !isForceChange; // User changing their own password voluntarily
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    // Require current password for voluntary changes (not forced changes)
    if (isSelfChange && !currentPassword.trim()) {
      setError('Current password is required');
      return;
    }
    console.log('Submitting password change...');
    setLoading(true);
    const res = await updatePassword(password, isSelfChange ? currentPassword : undefined);
    console.log('Password change result:', res);
    setLoading(false);

    if (res.success) {
      console.log('Password change successful, redirecting...');
      setSuccess('Password updated successfully. Redirecting...');
      setTimeout(() => {
        window.location.hash = '/'; // ✅ Use hash navigation
      }, 2000);
    } else {
      console.log('Password change failed');
      setError(res.message || 'Failed to update password. Try again.');
    }
  };

  const getPasswordStrengthColor = (password: string) => {
    if (password.length < 6) return 'bg-red-500';
    if (password.length < 8) return 'bg-yellow-500';
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getPasswordStrengthText = (password: string) => {
    if (password.length < 6) return 'Too short';
    if (password.length < 8) return 'Fair';
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 'Strong';
    return 'Good';
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden flex items-center justify-center px-4">
      {/* Cybersecurity Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(0,255,255,0.05)_25%,rgba(0,255,255,0.05)_26%,transparent_27%,transparent_74%,rgba(0,255,255,0.05)_75%,rgba(0,255,255,0.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(0,255,255,0.05)_25%,rgba(0,255,255,0.05)_26%,transparent_27%,transparent_74%,rgba(0,255,255,0.05)_75%,rgba(0,255,255,0.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
      </div>

      <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-cyan-500/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Glowing Border Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-transparent to-cyan-500/20 rounded-2xl blur-sm"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent rounded-2xl"></div>
        
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-pulse opacity-75"></div>
            <Shield className="w-8 h-8 text-white relative z-10" />
          </div>
        </div>
        
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-2 font-mono">
            {isForceChange ? 'Password Change Required' : 'Change Your Password'}
          </h2>
          
          {isForceChange ? (
            <p className="text-sm text-red-300 mb-2">
              Your account requires a new password before proceeding.
            </p>
          ) : (
            <p className="text-sm text-cyan-300 mb-2">
              Update your password to keep your account secure.
            </p>
          )}
          
          {user && user.passwordExpiresAt && user.role !== 'superadmin' && (
            <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300">
                  {(() => {
                    const now = new Date();
                    const expiresAt = new Date(user.passwordExpiresAt);
                    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysUntilExpiry > 0) {
                      return `Password expires in ${daysUntilExpiry} days`;
                    } else if (daysUntilExpiry < 0) {
                      return `Password expired ${Math.abs(daysUntilExpiry)} days ago`;
                    } else {
                      return 'Password expires today';
                    }
                  })()}
                </span>
              </div>
            </div>
          )}
          
          {user?.role === 'superadmin' && (
            <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-sm">
                <Shield className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300">
                  Your password does not expire (Admin account)
                </span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-red-300 bg-red-500/20 p-3 rounded-lg border border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="text-green-300 bg-green-500/20 p-3 rounded-lg text-sm text-center border border-green-500/30">
              {success}
            </div>
          )}

          {isSelfChange && (
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                Current Password
              </label>
              <div className="relative group">
                <Lock className="absolute top-2.5 left-3 h-4 w-4 text-cyan-400 group-focus-within:text-cyan-300 transition-colors" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 font-mono"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute top-2.5 right-3 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
              New Password
            </label>
            <div className="relative group">
              <Lock className="absolute top-2.5 left-3 h-4 w-4 text-cyan-400 group-focus-within:text-cyan-300 transition-colors" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute top-2.5 right-3 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(password)}`}
                      style={{ width: `${Math.min((password.length / 12) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-cyan-400">{getPasswordStrengthText(password)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
              Confirm New Password
            </label>
            <div className="relative group">
              <Lock className="absolute top-2.5 left-3 h-4 w-4 text-cyan-400 group-focus-within:text-cyan-300 transition-colors" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 font-mono"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute top-2.5 right-3 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-red-300 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
            <h4 className="text-sm font-medium text-yellow-300 mb-2 font-mono">Password Requirements:</h4>
            <ul className="text-xs text-yellow-400 space-y-1">
              <li>• At least 6 characters long</li>
              <li>• Cannot reuse your last 5 passwords</li>
              {user?.role !== 'superadmin' && (
                <li>• Will expire in 90 days (you'll be notified)</li>
              )}
              <li>• Recommended: Include uppercase, lowercase, and numbers</li>
            </ul>
          </div>
          <div className="flex space-x-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10 flex items-center justify-center font-mono">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    <span>UPDATING...</span>
                  </>
                ) : (
                  <span>UPDATE PASSWORD</span>
                )}
              </div>
            </button>
            {!isForceChange && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Back button clicked');
                  try {
                    // Try multiple navigation methods
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      // Fallback to dashboard
                      window.location.hash = '#/';
                      window.location.reload();
                    }
                  } catch (error) {
                    console.error('Navigation error:', error);
                    // Final fallback
                    window.location.href = window.location.origin + '/#/';
                  }
                }}
                className="w-full bg-gray-500/20 text-gray-300 py-3 rounded-lg hover:bg-gray-500/30 transition-colors border border-gray-500/30 font-mono flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>BACK</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
