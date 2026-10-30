import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  RefreshCw,
  Search,
  AlertCircle,
  Calendar,
  User,
  Phone,
  Flame,
  CheckCheck,
} from 'lucide-react';
import { adminApi } from '../services/api';

export const LiveOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [restaurantFilter, setRestaurantFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [restaurantsList, setRestaurantsList] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await adminApi.getOrders({
        status: statusFilter,
        restaurantId: restaurantFilter,
      });
      setOrders(res.data || []);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (err: any) {
      console.warn('Failed to fetch orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const res = await adminApi.getRestaurants();
      setRestaurantsList(res.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 12000);
    return () => clearInterval(interval);
  }, [statusFilter, restaurantFilter]);

  const handleConfirmDriverPickup = async (orderId: string, driverName?: string) => {
    try {
      setActionLoading(orderId);
      const res = await adminApi.confirmDriverPickup(orderId, driverName);
      setActionMessage(res.message || 'Driver pickup confirmed! Restaurant notified.');
      setTimeout(() => setActionMessage(null), 6000);
      await fetchOrders(true);
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    return (
      o.orderNumber?.toLowerCase().includes(term) ||
      o.customerName?.toLowerCase().includes(term) ||
      o.restaurantName?.toLowerCase().includes(term) ||
      o.riderName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark tracking-tight flex items-center space-x-2">
            <span>Live Kitchen Orders & Handover Tracker</span>
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Real-time kitchen order execution, handover cutoffs, and delivery driver pickup verification.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchOrders()}
            className="p-2.5 rounded-xl border border-brand-mint-border bg-white text-brand-muted hover:text-brand-forest hover:bg-brand-mint-subtle transition-all flex items-center space-x-1.5 text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-soft-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-brand-mint-border rounded-2xl p-5 shadow-soft-sm">
          <div className="flex justify-between items-center text-xs font-bold text-brand-muted uppercase">
            <span>All Orders</span>
            <ShoppingBag className="w-4 h-4 text-brand-forest" />
          </div>
          <div className="text-2xl font-black text-brand-dark mt-2">{counts.all || orders.length}</div>
          <div className="text-[11px] text-brand-muted mt-0.5">Across registered kitchens</div>
        </div>

        <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-soft-sm bg-red-50/20">
          <div className="flex justify-between items-center text-xs font-bold text-red-700 uppercase">
            <span>Incoming</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">{counts.incoming || 0}</div>
          <div className="text-[11px] text-red-600 font-semibold mt-0.5">Awaiting kitchen ack</div>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-soft-sm bg-amber-50/20">
          <div className="flex justify-between items-center text-xs font-bold text-amber-700 uppercase">
            <span>In Kitchen</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{counts.preparing || 0}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Station preparing meal</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-soft-sm bg-emerald-50/20">
          <div className="flex justify-between items-center text-xs font-bold text-emerald-700 uppercase">
            <span>Ready for Rider</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{counts.ready || 0}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Awaiting driver pickup</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-brand-mint-border rounded-2xl p-4 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, customer, restaurant, rider..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-brand-mint-border focus:border-brand-forest focus:outline-none bg-brand-cream/30"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={restaurantFilter}
              onChange={(e) => setRestaurantFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-brand-mint-border focus:border-brand-forest focus:outline-none bg-white text-brand-dark font-medium"
            >
              <option value="all">All Restaurants</option>
              {restaurantsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isOnline ? '🟢' : ''}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-brand-mint-border focus:border-brand-forest focus:outline-none bg-white text-brand-dark font-medium"
            >
              <option value="all">All Pipeline Stages</option>
              <option value="incoming">Incoming Only</option>
              <option value="preparing">In Kitchen (Prep)</option>
              <option value="ready">Ready for Pickup</option>
              <option value="dispatched">Dispatched / With Rider</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-brand-mint-border rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-mint-subtle/70 text-brand-dark font-extrabold uppercase tracking-wider border-b border-brand-mint-border text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Order & Restaurant</th>
                <th className="py-3.5 px-4">Handover Date & Time</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Items Summary</th>
                <th className="py-3.5 px-4">Pipeline Status</th>
                <th className="py-3.5 px-4">Delivery Driver</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-mint-border/50">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    Loading live orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    No orders matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isReady = o.status === 'ready';
                  const isIncoming = o.status === 'incoming';
                  const isPrep = o.status === 'preparing';
                  const isDispatched = o.status === 'dispatched';

                  return (
                    <tr key={o.id} className="hover:bg-brand-mint-subtle/30 transition-colors">
                      {/* Order & Restaurant */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm text-brand-dark">{o.orderNumber}</div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="font-semibold text-brand-forest">{o.restaurantName}</span>
                          {o.restaurantIsOnline ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              🟢 Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-gray-100 text-gray-600">
                              Offline
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-brand-muted font-mono">{o.restaurantCode}</div>
                      </td>

                      {/* Prominent Handover Date & Time */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-950 font-black text-xs">
                          <Clock className="w-3.5 h-3.5 text-orange-600" />
                          <span>{o.handoverTime || '12:15 PM'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-[11px] text-blue-800 font-semibold mt-1">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>{o.deliveryDate || 'Today, Oct 30'}</span>
                        </div>
                        <div className="text-[10px] text-brand-muted">{o.deliverySlot}</div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-bold text-brand-dark flex items-center space-x-1">
                          <User className="w-3 h-3 text-brand-muted" />
                          <span>{o.customerName}</span>
                        </div>
                        <div className="text-[11px] text-brand-muted flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-brand-muted" />
                          <span>{o.customerPhone || 'Online'}</span>
                        </div>
                      </td>

                      {/* Items Summary */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-[200px]">
                          {o.items?.map((it: any, i: number) => (
                            <div key={i} className="text-[11px] text-brand-dark truncate font-medium">
                              <span className="font-bold text-brand-forest">
                                {it.quantity || it.qty || 1}x
                              </span>{' '}
                              {it.name}
                            </div>
                          ))}
                        </div>
                        <div className="font-extrabold text-brand-dark mt-1 text-[11px]">
                          ${(Number(o.totalAmount) || 0).toFixed(2)} • {o.items?.length || 0} items
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
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

                      {/* Delivery Driver */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-brand-dark flex items-center space-x-1">
                          <Truck className="w-3.5 h-3.5 text-brand-forest" />
                          <span>{o.riderName || 'Assigning...'}</span>
                        </div>
                        <div className="text-[11px] text-brand-muted">
                          {o.riderStatus === 'picked_up' ? (
                            <span className="text-emerald-700 font-bold">✓ Picked Up</span>
                          ) : o.riderStatus === 'at_kitchen' ? (
                            <span className="text-emerald-700 font-bold">At Kitchen Counter</span>
                          ) : (
                            <span>ETA ~{o.riderEtaMins || 10} mins</span>
                          )}
                        </div>
                        {o.driverConfirmedAt && (
                          <div className="text-[10px] text-emerald-800 font-medium">
                            Confirmed: {new Date(o.driverConfirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {isReady ? (
                          <button
                            onClick={() => handleConfirmDriverPickup(o.id, o.riderName)}
                            disabled={actionLoading === o.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-soft transition-all flex items-center space-x-1 ml-auto"
                            title="Confirm delivery driver has picked up order"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>{actionLoading === o.id ? 'Confirming...' : 'Confirm Driver Pickup'}</span>
                          </button>
                        ) : isDispatched ? (
                          <span className="text-emerald-700 font-extrabold text-[11px] flex items-center justify-end space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Handed Over</span>
                          </span>
                        ) : (
                          <span className="text-brand-muted text-[11px]">In Progress</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

