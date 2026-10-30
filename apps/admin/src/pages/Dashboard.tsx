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
  ShoppingBag,
  Truck,
  Flame,
  CheckCheck,
  Activity,
  Calendar,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface DashboardProps {
  onNavigate: (tab: string, updateId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pickupSuccess, setPickupSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
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
    const interval = setInterval(loadData, 10000); // Polling every 10s for live presence & order updates
    return () => clearInterval(interval);
  }, []);

  const handleConfirmDriverPickup = async (orderId: string, driverName?: string) => {
    try {
      setActionLoading(orderId);
      const res = await adminApi.confirmDriverPickup(orderId, driverName);
      setPickupSuccess(res.message);
      setTimeout(() => setPickupSuccess(null), 5000);
      await loadData();
    } catch (err: any) {
      alert(`Handover failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-brand-mint-border/40 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-brand-mint-border/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark tracking-tight">Operations Dashboard</h1>
          <p className="text-xs text-brand-muted mt-1">
            Real-time partner delivery tracking, operational updates, and active kitchen status monitor.
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
            onClick={() => onNavigate('orders')}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-soft flex items-center space-x-2 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders Monitor</span>
          </button>
          <button
            onClick={() => onNavigate('create-update')}
            className="px-4 py-2.5 bg-brand-forest hover:bg-brand-forest-dark text-white rounded-xl text-xs font-bold shadow-soft flex items-center space-x-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Update</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs">
          {error}
        </div>
      )}

      {pickupSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-soft-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{pickupSuccess}</span>
        </div>
      )}

      {/* KPI Cards (Including Online Restaurants and Active Orders) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Active Now (Logged In) */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-soft-sm space-y-2 bg-emerald-50/20">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Online Now</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{metrics?.onlineRestaurants || 0}</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>Logged In Now</span>
            </div>
          </div>
        </div>

        {/* Active Orders Pipeline */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-4 shadow-soft-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wide">Active Orders</span>
            <div className="w-7 h-7 rounded-lg bg-brand-mint flex items-center justify-center text-brand-forest">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-dark">{metrics?.ordersByStatus?.active || 0}</div>
            <div className="text-[10px] text-brand-muted mt-0.5">In prep or awaiting rider</div>
          </div>
        </div>

        {/* Registered Restos */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-4 shadow-soft-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wide">Registered Restos</span>
            <div className="w-7 h-7 rounded-lg bg-brand-mint flex items-center justify-center text-brand-forest">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-dark">{metrics?.totalRestaurants || 0}</div>
            <div className="text-[10px] text-brand-muted mt-0.5">{metrics?.activePartners || 0} active partners</div>
          </div>
        </div>

        {/* Published Updates */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-4 shadow-soft-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wide">Published Updates</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-dark">{metrics?.updatesPublished || 0}</div>
            <div className="text-[10px] text-brand-muted mt-0.5">Operational broadcasts</div>
          </div>
        </div>

        {/* Awaiting Response */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-4 shadow-soft-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wide">Awaiting Response</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-dark">{metrics?.updatesAwaitingResponses || 0}</div>
            <div className="text-[10px] text-amber-700 font-medium mt-0.5">Pending kitchen action</div>
          </div>
        </div>

        {/* Urgent / Overdue */}
        <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-soft-sm space-y-2 bg-red-50/20">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">Urgent</span>
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-600">{metrics?.urgentOrOverdueResponses || 0}</div>
            <div className="text-[10px] text-red-600 font-semibold mt-0.5">Requires escalation</div>
          </div>
        </div>
      </div>

      {/* Prominent Live Orders Monitor Section */}
      <div className="bg-white border border-brand-mint-border rounded-2xl p-6 shadow-soft space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-brand-dark flex items-center space-x-2">
              <span>Live Kitchen Orders & Handover Tracker</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                Active Feed
              </span>
            </h2>
            <p className="text-xs text-brand-muted">
              Live status across all kitchens with handover cutoffs and driver pickup confirmation
            </p>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-brand-forest hover:underline flex items-center space-x-1"
          >
            <span>View All ({metrics?.ordersByStatus?.total || 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-mint-subtle/70 text-brand-dark font-extrabold uppercase tracking-wider border-b border-brand-mint-border text-[11px]">
              <tr>
                <th className="py-3 px-3">Order #</th>
                <th className="py-3 px-3">Restaurant Partner</th>
                <th className="py-3 px-3">Handover Date & Time</th>
                <th className="py-3 px-3">Customer & Bill</th>
                <th className="py-3 px-3">Pipeline Status</th>
                <th className="py-3 px-3">Delivery Driver</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-mint-border/50">
              {metrics?.recentOrders && metrics.recentOrders.length > 0 ? (
                metrics.recentOrders.slice(0, 5).map((o: any) => {
                  const isReady = o.status === 'ready';
                  const isIncoming = o.status === 'incoming';
                  const isPrep = o.status === 'preparing';
                  const isDispatched = o.status === 'dispatched';

                  return (
                    <tr key={o.id} className="hover:bg-brand-mint-subtle/30 transition-colors">
                      <td className="py-3 px-3 font-extrabold text-brand-dark">{o.orderNumber}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-brand-dark flex items-center space-x-1.5">
                          <span>{o.restaurantName}</span>
                          {o.restaurantIsOnline && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Online" />
                          )}
                        </div>
                        <div className="text-[10px] text-brand-muted font-mono">{o.restaurantCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-950 font-black text-[11px]">
                          <Clock className="w-3 h-3 text-orange-600" />
                          <span>{o.handoverTime || '12:15 PM'}</span>
                        </div>
                        <div className="text-[10px] text-blue-800 font-semibold mt-0.5">
                          {o.deliveryDate || 'Today, Oct 30'} • {o.deliverySlot}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-brand-dark">{o.customerName}</div>
                        <div className="text-[10px] font-bold text-brand-forest">
                          ${(Number(o.totalAmount) || 0).toFixed(2)} ({o.itemsCount} items)
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isIncoming
                              ? 'bg-red-100 text-red-800 animate-pulse'
                              : isPrep
                              ? 'bg-amber-100 text-amber-800'
                              : isReady
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isIncoming && 'Action Required'}
                          {isPrep && 'In Kitchen Prep'}
                          {isReady && 'Ready for Pickup'}
                          {isDispatched && 'With Driver'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-brand-dark flex items-center space-x-1">
                          <Truck className="w-3 h-3 text-brand-forest" />
                          <span>{o.riderName || 'Driver assigned'}</span>
                        </div>
                        <div className="text-[10px] text-brand-muted">
                          {o.riderStatus === 'picked_up' ? (
                            <span className="text-emerald-700 font-bold">✓ Picked Up</span>
                          ) : o.riderStatus === 'at_kitchen' ? (
                            <span className="text-emerald-700 font-bold">At Kitchen Counter</span>
                          ) : (
                            <span>ETA ~{o.riderEtaMins || 10} mins</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isReady ? (
                          <button
                            onClick={() => handleConfirmDriverPickup(o.id, o.riderName)}
                            disabled={actionLoading === o.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-soft transition-all inline-flex items-center space-x-1"
                          >
                            <CheckCheck className="w-3 h-3" />
                            <span>Confirm Pickup</span>
                          </button>
                        ) : isDispatched ? (
                          <span className="text-emerald-700 font-bold text-[11px]">Handed Over</span>
                        ) : (
                          <span className="text-brand-muted text-[10px]">Cooking</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-brand-muted">
                    No orders currently in the pipeline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Grid: Recent Updates & Active Restaurants */}
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

        {/* Active Logged-In Restaurants & Activity Feed (1 Col) */}
        <div className="bg-white border border-brand-mint-border rounded-2xl p-6 shadow-soft space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-brand-dark">Active Kitchen Presence</h2>
            <p className="text-xs text-brand-muted">Partners currently logged in & operational</p>
          </div>

          <div className="space-y-2.5">
            {metrics?.activeRestaurantsList && metrics.activeRestaurantsList.length > 0 ? (
              metrics.activeRestaurantsList.map((r: any) => (
                <div key={r.id} className="p-3 bg-brand-mint-subtle border border-brand-mint-border rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-extrabold text-brand-dark">{r.name}</span>
                      {r.isOnline ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          🟢 Online
                        </span>
                      ) : (
                        <span className="text-[10px] text-brand-muted">Offline</span>
                      )}
                    </div>
                    <div className="text-[10px] text-brand-muted">{r.ownerName} • {r.code}</div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-mint text-brand-forest">
                      {r.activeOrdersCount || 0} active
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-brand-muted">No partners logged in.</div>
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
