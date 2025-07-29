import React, { useState } from 'react';
import { Shield, User, Lock, Eye, EyeOff, Terminal, Zap, Globe, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Cybersecurity Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(0,255,255,0.05)_25%,rgba(0,255,255,0.05)_26%,transparent_27%,transparent_74%,rgba(0,255,255,0.05)_75%,rgba(0,255,255,0.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(0,255,255,0.05)_25%,rgba(0,255,255,0.05)_26%,transparent_27%,transparent_74%,rgba(0,255,255,0.05)_75%,rgba(0,255,255,0.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
      </div>

      {/* Animated Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Security Icons */}
        <div className="absolute top-20 left-10 animate-float">
          <Shield className="h-8 w-8 text-cyan-400 opacity-30" />
        </div>
        <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: '1s' }}>
          <Terminal className="h-6 w-6 text-green-400 opacity-30" />
        </div>
        <div className="absolute bottom-40 left-20 animate-float" style={{ animationDelay: '2s' }}>
          <Zap className="h-7 w-7 text-yellow-400 opacity-30" />
        </div>
        <div className="absolute bottom-20 right-10 animate-float" style={{ animationDelay: '3s' }}>
          <Globe className="h-8 w-8 text-blue-400 opacity-30" />
        </div>
        <div className="absolute top-60 left-1/2 animate-float" style={{ animationDelay: '4s' }}>
          <AlertTriangle className="h-6 w-6 text-red-400 opacity-30" />
        </div>
      </div>

      {/* Main Login Container */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md lg:max-w-lg p-4 sm:p-8">
        <div className="bg-black/40 backdrop-blur-xl border border-cyan-500/20 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Glowing Border Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-transparent to-cyan-500/20 rounded-2xl blur-sm"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent rounded-2xl"></div>
          
          <div className="relative z-10">
            {/* Logo and Title */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mb-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-pulse opacity-75"></div>
                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white relative z-10" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-wide">
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  THREAT RESPONSE
                </span>
              </h1>
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent flex-1"></div>
                <span className="text-cyan-400 text-xs font-mono">SECURE ACCESS</span>
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent flex-1"></div>
              </div>
              <p className="text-cyan-200 text-sm">
                IP Threat Intelligence Platform
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <span className="text-red-300 text-sm font-mono">{error}</span>
                  </div>
                </div>
              )}

              {/* Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-cyan-200 font-mono">
                  USERNAME
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-cyan-400 group-focus-within:text-cyan-300 transition-colors" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 font-mono"
                    placeholder="Enter username"
                    required
                  />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-cyan-200 font-mono">
                  PASSWORD
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-cyan-400 group-focus-within:text-cyan-300 transition-colors" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 font-mono"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      <span className="font-mono">AUTHENTICATING...</span>
                    </>
                  ) : (
                    <span className="font-mono">ACCESS SYSTEM</span>
                  )}
                </div>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 sm:mt-8 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-xs text-cyan-300 font-mono">
                  SECURE CONNECTION ESTABLISHED
                </p>
              </div>
              <p className="text-xs text-gray-400">
                Advanced Threat Intelligence • Real-time Protection
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};