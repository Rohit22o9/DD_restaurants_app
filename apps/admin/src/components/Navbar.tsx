import React from 'react';
import { Bell, ShieldCheck, LogOut, ExternalLink } from 'lucide-react';
import logo from '../assets/daily_drop_logo.png';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-brand-mint-border px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <img src={logo} alt="Daily Drop" className="h-8 w-auto object-contain" />
        <span className="text-xs uppercase tracking-wider font-bold bg-brand-forest text-white px-2 py-0.5 rounded-full">
          Operations Admin
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-brand-mint-subtle border border-brand-mint-border px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-brand-forest">System Active • Server Port 4000</span>
        </div>

        <div className="flex items-center space-x-3 pl-4 border-l border-brand-mint-border">
          <div className="text-right">
            <div className="text-sm font-bold text-brand-dark">{user?.name || 'Operations Lead'}</div>
            <div className="text-xs text-brand-muted">{user?.email || 'admin@dailydrop.com'}</div>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-brand-muted hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
