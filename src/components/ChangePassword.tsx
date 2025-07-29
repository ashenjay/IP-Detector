import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, Shield, Eye, EyeOff, Calendar, Clock } from 'lucide-react';

const ChangePassword: React.FC = () => {
  const { updatePassword, logout, user, passwordStatus } = useAuth();
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-md">
        <div className="flex justify-center mb-4">
          <Shield className="h-10 w-10 text-blue-600" />
        </div>
        
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {isForceChange ? 'Password Change Required' : 'Change Your Password'}
          </h2>
          
          {isForceChange ? (
            <p className="text-sm text-red-600 mb-2">
              Your account requires a new password before proceeding.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-2">
              Update your password to keep your account secure.
            </p>
          )}
          
          {passwordStatus && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800">
                  {passwordStatus.password_status === 'No Expiration' ? (
                    'Your password does not expire'
                  ) : passwordStatus.days_until_expiry > 0 ? (
                    `Password expires in ${passwordStatus.days_until_expiry} days`
                  ) : passwordStatus.days_until_expiry < 0 ? (
                    `Password expired ${Math.abs(passwordStatus.days_until_expiry)} days ago`
                  ) : (
                    'Password expires today'
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="text-green-600 bg-green-50 p-3 rounded-lg text-sm text-center">
              {success}
            </div>
          )}

          {isSelfChange && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:outline-none"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(password)}`}
                      style={{ width: `${Math.min((password.length / 12) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{getPasswordStrengthText(password)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:outline-none"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Password Requirements:</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
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
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            {!isForceChange && (
              <button
                type="button"
                onClick={() => window.location.hash = '/'}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
