import React, { useEffect, useState } from 'react';
import {
  Store,
  CheckCircle,
  Radio,
  Clock,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface DashboardProps {
  onNavigate: (tab: string, updateId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDashboardMetrics();
      setMetrics(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // Polling every 20s
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-brand-mint-border/40 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-brand-mint-border/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark tracking-tight">Operations Dashboard</h1>
          <p className="text-xs text-brand-muted mt-1">
            Real-time partner delivery tracking, operational updates, and kitchen status monitor.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            title="Refresh Live Data"
            className="p-2.5 rounded-xl border border-brand-mint-border bg-white text-brand-muted hover:text-brand-forest hover:bg-brand-mint-subtle transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('create-update')}
            className="px-4 py-2.5 bg-brand-forest hover:bg-brand-forest-dark text-white rounded-xl text-xs font-bold shadow-soft flex items-center space-x-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Operational Update</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Restaurants */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-5 shadow-soft-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wide">Registered Restos</span>
            <div className="w-8 h-8 rounded-xl bg-brand-mint flex items-center justify-center text-brand-forest">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-dark">{metrics?.totalRestaurants || 0}</div>
            <div className="text-[11px] text-brand-muted mt-0.5">Across all city clusters</div>
          </div>
        </div>

        {/* Active Partners */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-5 shadow-soft-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wide">Active Partners</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-dark">{metrics?.activePartners || 0}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Ready for orders</div>
          </div>
        </div>

        {/* Updates Published */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-5 shadow-soft-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wide">Published Updates</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-dark">{metrics?.updatesPublished || 0}</div>
            <div className="text-[11px] text-brand-muted mt-0.5">Active operational briefs</div>
          </div>
        </div>

        {/* Updates Awaiting Response */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-5 shadow-soft-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wide">Awaiting Response</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-dark">{metrics?.updatesAwaitingResponses || 0}</div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">Pending kitchen action</div>
          </div>
        </div>

        {/* Urgent / Overdue */}
        <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-soft-sm space-y-3 bg-red-50/20">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Urgent / Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-600">{metrics?.urgentOrOverdueResponses || 0}</div>
            <div className="text-[11px] text-red-600 font-semibold mt-0.5">Requires ops escalation</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Updates & Recent Partner Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Updates (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-brand-mint-border rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-extrabold text-brand-dark">Recent Operational Updates</h2>
              <p className="text-xs text-brand-muted">Target audience distribution and response completion</p>
            </div>
            <button
              onClick={() => onNavigate('updates')}
              className="text-xs font-bold text-brand-forest hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-brand-mint-border/60">
            {metrics?.recentUpdates && metrics.recentUpdates.length > 0 ? (
              metrics.recentUpdates.map((u: any) => {
                const responseRate = u.targetedCount > 0 ? Math.round((u.responseSubmittedCount / u.targetedCount) * 100) : 0;
                return (
                  <div key={u.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                            u.priority === 'urgent'
                              ? 'bg-red-100 text-red-700'
                              : u.priority === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-brand-mint text-brand-forest'
                          }`}
                        >
                          {u.priority}
                        </span>
                        <span className="text-xs text-brand-muted font-medium">{u.category}</span>
                      </div>
                      <h4
                        onClick={() => onNavigate('tracking', u.id)}
                        className="text-sm font-bold text-brand-dark hover:text-brand-forest cursor-pointer transition-colors"
                      >
                        {u.title}
                      </h4>
                      <div className="text-[11px] text-brand-muted">
                        Published: {new Date(u.publishedAt || u.createdAt).toLocaleDateString()}
                        {u.deadlineAt && (
                          <span className="ml-2 text-amber-700 font-semibold">
                            • Deadline: {new Date(u.deadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Response Progress & Action */}
                    <div className="flex items-center space-x-4">
                      <div className="w-32">
                        <div className="flex justify-between text-[11px] font-bold text-brand-dark mb-1">
                          <span>Responses</span>
                          <span>{u.responseSubmittedCount}/{u.targetedCount}</span>
                        </div>
                        <div className="w-full bg-brand-mint-subtle h-2 rounded-full overflow-hidden border border-brand-mint-border">
                          <div
                            className="bg-brand-forest h-full rounded-full transition-all duration-300"
                            style={{ width: `${responseRate}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate('tracking', u.id)}
                        className="px-3 py-1.5 text-xs font-bold text-brand-forest bg-brand-mint hover:bg-brand-mint/80 rounded-xl transition-all"
                      >
                        Track
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-brand-muted">
                No operational updates published yet.
              </div>
            )}
          </div>
        </div>

        {/* Live Restaurant Activity Feed (1 Col) */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-6 shadow-soft space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-brand-dark">Recent Partner Activity</h2>
            <p className="text-xs text-brand-muted">Incoming confirmations and responses</p>
          </div>

          <div className="space-y-3">
            {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
              metrics.recentActivity.map((act: any) => (
                <div key={act.id} className="p-3 bg-brand-mint-subtle border border-brand-mint-border rounded-xl space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-extrabold text-brand-dark">{act.restaurantName}</span>
                    <span className="text-[10px] text-brand-muted">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted font-medium line-clamp-1">{act.updateTitle}</p>
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle className="w-3 h-3" />
                    <span>Response Submitted</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-brand-muted">
                No recent response activity logged yet.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-brand-mint-border">
            <button
              onClick={() => onNavigate('restaurants')}
              className="w-full py-2 bg-brand-mint-subtle hover:bg-brand-mint text-brand-forest rounded-xl text-xs font-bold transition-all text-center"
            >
              Manage Restaurant Partners
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
