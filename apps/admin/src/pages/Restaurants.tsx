import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  Send,
  Edit2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Store,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../services/api';

export const Restaurants: React.FC = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  // Add Restaurant Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResto, setNewResto] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    sendInvite: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit Restaurant Modal
  const [editingResto, setEditingResto] = useState<any | null>(null);

  // Invitation Success Modal / Toast
  const [inviteModalData, setInviteModalData] = useState<{ email: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getRestaurants({ search, status: statusFilter });
      setRestaurants(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [search, statusFilter]);

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminApi.createRestaurant(newResto);
      setShowAddModal(false);
      setNewResto({ name: '', ownerName: '', email: '', phone: '', address: '', notes: '', sendInvite: true });
      fetchRestaurants();

      if (res.data.invitationUrl) {
        setInviteModalData({ email: newResto.email, url: res.data.invitationUrl });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResto) return;
    setSubmitting(true);
    try {
      await adminApi.updateRestaurant(editingResto.id, editingResto);
      setEditingResto(null);
      fetchRestaurants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvite = async (resto: any) => {
    try {
      const res = await adminApi.sendInvitation(resto.id);
      setInviteModalData({ email: resto.email, url: res.invitationUrl });
      fetchRestaurants();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (resto: any) => {
    const nextStatus = resto.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to ${nextStatus === 'suspended' ? 'suspend' : 'reactivate'} ${resto.name}?`)) {
      return;
    }
    try {
      await adminApi.toggleRestaurantStatus(resto.id, nextStatus);
      fetchRestaurants();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark tracking-tight">Restaurant Partners</h1>
          <p className="text-xs text-brand-muted mt-1">
            Manage collaborating kitchens, send onboarding invitations, and monitor update response compliance.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-brand-forest hover:bg-brand-forest-dark text-white rounded-xl text-xs font-bold shadow-soft flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Restaurant Partner</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by restaurant name, owner, email, or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-brand-mint-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-forest text-brand-dark"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['all', 'online', 'active', 'pending_invitation', 'suspended'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                statusFilter === status
                  ? 'bg-brand-forest text-white'
                  : 'bg-white border border-brand-mint-border text-brand-muted hover:bg-brand-mint-subtle'
              }`}
            >
              {status === 'online' ? '🟢 Online Now' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-brand-mint-border rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-mint-subtle/80 border-b border-brand-mint-border text-[11px] font-bold text-brand-muted uppercase tracking-wider">
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Owner / Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Pending Updates</th>
                <th className="py-3 px-4">Date Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-mint-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    Loading restaurant partners...
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    No restaurant partners found matching criteria.
                  </td>
                </tr>
              ) : (
                restaurants.map(r => (
                  <tr key={r.id} className="hover:bg-brand-mint-subtle/40 transition-colors">
                    {/* Restaurant Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-brand-dark">{r.name}</span>
                        {r.isOnline && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                            🟢 Online
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-brand-muted font-mono">{r.code}</div>
                    </td>

                    {/* Owner & Contact */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-semibold text-brand-dark">{r.ownerName}</div>
                      <div className="text-[11px] text-brand-muted flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{r.email}</span>
                      </div>
                      <div className="text-[11px] text-brand-muted flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{r.phone}</span>
                      </div>
                    </td>

                    {/* Status & Online Presence Badge */}
                    <td className="py-3.5 px-4 space-y-1">
                      <div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            r.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'pending_invitation'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.status === 'active' && 'Active'}
                          {r.status === 'pending_invitation' && 'Pending Invite'}
                          {r.status === 'suspended' && 'Suspended'}
                        </span>
                      </div>
                      <div>
                        {r.isOnline ? (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                            <span>Logged In (Active)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-brand-muted">App Offline</span>
                        )}
                      </div>
                    </td>

                    {/* Active Orders & Pending Updates */}
                    <td className="py-3.5 px-4 space-y-1">
                      {r.activeOrdersCount > 0 && (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-forest text-white">
                            {r.activeOrdersCount} active orders
                          </span>
                        </div>
                      )}
                      {r.pendingUpdateCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {r.pendingUpdateCount} pending updates
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Updates Clear</span>
                        </span>
                      )}
                    </td>

                    {/* Date Joined */}
                    <td className="py-3.5 px-4 text-brand-muted text-[11px]">
                      {new Date(r.dateJoined).toLocaleDateString()}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {r.status === 'pending_invitation' && (
                          <button
                            onClick={() => handleSendInvite(r)}
                            title="Resend Invitation Email & Link"
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-xs flex items-center space-x-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Invite</span>
                          </button>
                        )}

                        <button
                          onClick={() => setEditingResto(r)}
                          title="Edit Restaurant Info"
                          className="p-1.5 rounded-lg bg-brand-mint-subtle text-brand-forest hover:bg-brand-mint"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(r)}
                          title={r.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                          className={`p-1.5 rounded-lg ${
                            r.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {r.status === 'active' ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Restaurant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-soft-lg space-y-4">
            <h3 className="font-extrabold text-base text-brand-dark">Add New Restaurant Partner</h3>
            <form onSubmit={handleAddRestaurant} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-brand-dark mb-1">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  value={newResto.name}
                  onChange={e => setNewResto({ ...newResto, name: e.target.value })}
                  placeholder="e.g. Daily Bento Central"
                  className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">Owner / Manager Name *</label>
                  <input
                    type="text"
                    required
                    value={newResto.ownerName}
                    onChange={e => setNewResto({ ...newResto, ownerName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={newResto.phone}
                    onChange={e => setNewResto({ ...newResto, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-dark mb-1">Registered Email *</label>
                <input
                  type="email"
                  required
                  value={newResto.email}
                  onChange={e => setNewResto({ ...newResto, email: e.target.value })}
                  placeholder="partner@restaurant.dailydrop.com"
                  className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-dark mb-1">Kitchen Address</label>
                <input
                  type="text"
                  value={newResto.address}
                  onChange={e => setNewResto({ ...newResto, address: e.target.value })}
                  placeholder="Street, City, Pin Code"
                  className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="sendInvite"
                  checked={newResto.sendInvite}
                  onChange={e => setNewResto({ ...newResto, sendInvite: e.target.checked })}
                  className="rounded text-brand-forest focus:ring-brand-forest"
                />
                <label htmlFor="sendInvite" className="text-xs font-semibold text-brand-dark cursor-pointer">
                  Generate and send onboarding email invitation immediately
                </label>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-brand-mint-border rounded-xl text-xs font-semibold text-brand-muted hover:bg-brand-mint-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-brand-forest text-white rounded-xl text-xs font-bold hover:bg-brand-forest-dark"
                >
                  {submitting ? 'Creating...' : 'Save & Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Restaurant Modal */}
      {editingResto && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-soft-lg space-y-4">
            <h3 className="font-extrabold text-base text-brand-dark">Edit Restaurant Information</h3>
            <form onSubmit={handleEditRestaurant} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-brand-dark mb-1">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={editingResto.name}
                  onChange={e => setEditingResto({ ...editingResto, name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={editingResto.ownerName}
                    onChange={e => setEditingResto({ ...editingResto, ownerName: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={editingResto.phone}
                    onChange={e => setEditingResto({ ...editingResto, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-dark mb-1">Address</label>
                <input
                  type="text"
                  value={editingResto.address || ''}
                  onChange={e => setEditingResto({ ...editingResto, address: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingResto(null)}
                  className="flex-1 py-2.5 border border-brand-mint-border rounded-xl text-xs font-semibold text-brand-muted hover:bg-brand-mint-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-brand-forest text-white rounded-xl text-xs font-bold hover:bg-brand-forest-dark"
                >
                  {submitting ? 'Saving...' : 'Update Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invitation Link Details Modal */}
      {inviteModalData && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-soft-lg space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-brand-dark">Invitation Link Generated!</h3>
              <p className="text-xs text-brand-muted">
                Sent to <span className="font-bold text-brand-dark">{inviteModalData.email}</span>. Valid for 48 hours.
              </p>
            </div>

            <div className="bg-brand-mint-subtle p-3 rounded-xl border border-brand-mint-border break-all text-[11px] font-mono text-brand-dark select-all">
              {inviteModalData.url}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(inviteModalData.url)}
                className="flex-1 py-2.5 bg-brand-forest text-white rounded-xl text-xs font-bold hover:bg-brand-forest-dark flex items-center justify-center space-x-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={() => setInviteModalData(null)}
                className="px-4 py-2.5 border border-brand-mint-border rounded-xl text-xs font-semibold text-brand-muted hover:bg-brand-mint-subtle"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
