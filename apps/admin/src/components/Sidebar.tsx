import React from 'react';
import { LayoutDashboard, Store, Send, BellRing, PlusCircle } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'restaurants', label: 'Restaurant Partners', icon: Store },
    { id: 'updates', label: 'Update Broadcasts', icon: BellRing },
    { id: 'create-update', label: 'Create New Update', icon: PlusCircle, isHighlight: true },
  ];

  return (
    <aside className="w-64 bg-white border-r border-brand-mint-border flex flex-col justify-between p-4 h-[calc(100vh-4rem)] sticky top-16">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-brand-muted">
          Operations Management
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-brand-forest text-white shadow-soft font-semibold'
                  : item.isHighlight
                  ? 'text-brand-forest bg-brand-mint hover:bg-brand-mint/80 font-semibold'
                  : 'text-brand-dark/80 hover:bg-brand-mint-subtle hover:text-brand-forest'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-brand-forest'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-brand-mint-subtle border border-brand-mint-border p-4 rounded-xl text-xs space-y-2">
        <div className="font-bold text-brand-forest flex items-center space-x-1.5">
          <span>Daily Drop Partner Hub</span>
        </div>
        <p className="text-brand-muted leading-relaxed">
          Operational broadcasts instantly sync with the partner React Native mobile application.
        </p>
      </div>
    </aside>
  );
};
