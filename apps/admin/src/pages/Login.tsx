import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import logo from '../assets/daily_drop_logo.png';
import { adminApi } from '../services/api';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@dailydrop.com');
  const [password, setPassword] = useState('DailyDropAdmin2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminApi.login(email, password);
      if (res.user.role !== 'admin') {
        throw new Error('Access denied: You must be a Daily Drop Administrator to access this portal.');
      }
      localStorage.setItem('dd_admin_token', res.token);
      onLoginSuccess(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      await adminApi.forgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="w-full max-w-md bg-white border border-brand-mint-border shadow-soft-lg rounded-3xl p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img src={logo} alt="Daily Drop" className="h-10 mx-auto object-contain" />
          <h1 className="text-xl font-extrabold text-brand-dark pt-2">Operations Admin Portal</h1>
          <p className="text-xs text-brand-muted">
            Restaurant Partner Management & Update Broadcast Control Center
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-brand-mint-subtle/50 border border-brand-mint-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest focus:bg-white text-brand-dark"
                placeholder="admin@dailydrop.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wide">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs font-semibold text-brand-forest hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-brand-mint-subtle/50 border border-brand-mint-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest focus:bg-white text-brand-dark"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-dark"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-forest hover:bg-brand-forest-dark text-white rounded-xl font-bold text-sm shadow-soft transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-brand-mint-border text-center">
          <span className="text-xs text-brand-muted">
            Restricted access for authorized Daily Drop Operations personnel only.
          </span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-soft-lg space-y-4">
            <h3 className="font-bold text-base text-brand-dark">Reset Admin Password</h3>
            <p className="text-xs text-brand-muted">
              Enter your registered operations email to receive a password reset link.
            </p>

            {forgotSuccess ? (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Password reset instructions sent! Please check your email.</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="admin@dailydrop.com"
                  className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                />
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForgot(false); setForgotSuccess(false); }}
                    className="flex-1 py-2 border border-brand-mint-border rounded-xl text-xs font-semibold text-brand-muted hover:bg-brand-mint-subtle"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-brand-forest text-white rounded-xl text-xs font-bold hover:bg-brand-forest-dark"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}

            {forgotSuccess && (
              <button
                onClick={() => { setShowForgot(false); setForgotSuccess(false); }}
                className="w-full py-2 bg-brand-forest text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
