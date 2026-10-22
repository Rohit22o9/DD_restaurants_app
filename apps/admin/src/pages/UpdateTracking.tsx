import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Eye,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  MessageSquare,
  CheckCheck,
  Send,
  Calendar,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface UpdateTrackingProps {
  updateId: string;
  onBack: () => void;
}

export const UpdateTracking: React.FC<UpdateTrackingProps> = ({ updateId, onBack }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review Response Modal
  const [reviewModalData, setReviewModalData] = useState<{ responseId: string; restoName: string } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUpdateDetail(updateId);
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 15000); // Poll every 15s for live response updates
    return () => clearInterval(interval);
  }, [updateId]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalData) return;
    setReviewing(true);
    try {
      await adminApi.reviewResponse(updateId, reviewModalData.responseId, adminNotes);
      setReviewModalData(null);
      setAdminNotes('');
      fetchDetail();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReviewing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-6 w-32 bg-brand-mint-border/50 rounded animate-pulse" />
        <div className="h-32 bg-white rounded-3xl border border-brand-mint-border animate-pulse" />
      </div>
    );
  }

  const { metrics, attachments, recipients } = data || {};

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-brand-mint-border text-brand-forest hover:bg-brand-mint-subtle transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                data.priority === 'urgent'
                  ? 'bg-red-100 text-red-700'
                  : data.priority === 'high'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-brand-mint text-brand-forest'
              }`}
            >
              {data.priority}
            </span>
            <span className="text-xs font-semibold text-brand-muted">{data.category}</span>
          </div>
          <h1 className="text-xl font-extrabold text-brand-dark mt-0.5">{data.title}</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs">
          {error}
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Targeted', val: metrics?.targetedCount || 0, icon: Users, color: 'text-brand-dark', bg: 'bg-white' },
          { label: 'Delivered', val: metrics?.deliveredCount || 0, icon: Send, color: 'text-blue-600', bg: 'bg-blue-50/50' },
          { label: 'Opened / Read', val: metrics?.readCount || 0, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50/50' },
          { label: 'Acknowledged', val: metrics?.acknowledgedCount || 0, icon: CheckCircle, color: 'text-brand-forest', bg: 'bg-brand-mint-subtle' },
          { label: 'Responses In', val: metrics?.responseSubmittedCount || 0, icon: CheckCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Pending', val: metrics?.pendingCount || 0, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Overdue', val: metrics?.overdueCount || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className={`${m.bg} border border-brand-mint-border rounded-2xl p-4 text-center shadow-soft-sm space-y-1`}>
              <div className="flex justify-center mb-1">
                <Icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <div className={`text-xl font-black ${m.color}`}>{m.val}</div>
              <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* Attachments Section if any */}
      {attachments && attachments.length > 0 && (
        <div className="bg-white border border-brand-mint-border rounded-2xl p-4 shadow-soft space-y-2">
          <div className="text-xs font-bold text-brand-dark uppercase tracking-wider">Attached Documents</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((att: any) => (
              <div
                key={att.id}
                className="flex items-center space-x-2 bg-brand-mint-subtle border border-brand-mint-border px-3 py-2 rounded-xl text-xs"
              >
                <FileText className="w-4 h-4 text-brand-forest" />
                <span className="font-bold text-brand-dark">{att.fileName}</span>
                <span className="text-[10px] text-brand-muted">({(att.fileSize / 1024).toFixed(1)} KB)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Granular Restaurant Responses Table */}
      <div className="bg-white border border-brand-mint-border rounded-3xl shadow-soft overflow-hidden space-y-2">
        <div className="p-5 border-b border-brand-mint-border flex justify-between items-center bg-brand-mint-subtle/30">
          <div>
            <h2 className="text-base font-extrabold text-brand-dark">Restaurant Partner Response Matrix</h2>
            <p className="text-xs text-brand-muted">
              Live status tracking per recipient restaurant with exact delivery, read, and submission timestamps.
            </p>
          </div>
          <div className="text-xs font-bold text-brand-muted">
            {recipients?.length || 0} Targeted Partners
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-mint-subtle/80 border-b border-brand-mint-border text-[11px] font-bold text-brand-muted uppercase tracking-wider">
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Delivery & Read</th>
                <th className="py-3 px-4">Kitchen Confirmation</th>
                <th className="py-3 px-4">Partner Notes / Details</th>
                <th className="py-3 px-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-mint-border/60 text-xs">
              {recipients && recipients.length > 0 ? (
                recipients.map((r: any) => (
                  <tr key={r.id} className="hover:bg-brand-mint-subtle/40 transition-colors">
                    {/* Restaurant Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-brand-dark">{r.restaurantName}</div>
                      <div className="text-[11px] text-brand-muted font-mono">{r.restaurantCode}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          r.status === 'response_reviewed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'response_submitted'
                            ? 'bg-blue-100 text-blue-800'
                            : r.status === 'acknowledged'
                            ? 'bg-purple-100 text-purple-800'
                            : r.status === 'read'
                            ? 'bg-yellow-100 text-yellow-800'
                            : r.status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Delivery & Read Timestamps */}
                    <td className="py-3.5 px-4 space-y-0.5 text-[11px] text-brand-muted">
                      <div>Delivered: {r.deliveredAt ? new Date(r.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                      <div className={r.readAt ? 'text-brand-dark font-medium' : 'text-brand-muted'}>
                        Opened: {r.readAt ? new Date(r.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unopened'}
                      </div>
                    </td>

                    {/* Availability Confirmation */}
                    <td className="py-3.5 px-4">
                      {r.availabilityStatus ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            r.availabilityStatus === 'available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.availabilityStatus === 'partially_available'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.availabilityStatus.replace('_', ' ')}
                        </span>
                      ) : r.acknowledgedAt ? (
                        <span className="text-[11px] font-semibold text-purple-700">Acknowledged</span>
                      ) : (
                        <span className="text-[11px] text-brand-muted italic">Pending Kitchen Input</span>
                      )}
                    </td>

                    {/* Notes & Answers */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {r.answerText ? (
                        <div className="space-y-0.5">
                          <p className="text-xs text-brand-dark line-clamp-2 italic font-serif">
                            "{r.answerText}"
                          </p>
                          {r.adminNotes && (
                            <div className="text-[10px] text-brand-forest font-bold bg-brand-mint px-2 py-0.5 rounded">
                              Ops Note: {r.adminNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-brand-muted italic">No comments</span>
                      )}
                    </td>

                    {/* Review Action */}
                    <td className="py-3.5 px-4 text-right">
                      {r.responseId ? (
                        <button
                          onClick={() => {
                            setReviewModalData({ responseId: r.responseId, restoName: r.restaurantName });
                            setAdminNotes(r.adminNotes || '');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            r.status === 'response_reviewed'
                              ? 'bg-brand-mint text-brand-forest hover:bg-brand-mint/80'
                              : 'bg-brand-forest text-white hover:bg-brand-forest-dark shadow-soft-sm'
                          }`}
                        >
                          {r.status === 'response_reviewed' ? 'Edit Review' : 'Review Response'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-brand-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-brand-muted">
                    No restaurant recipients recorded for this update.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Response Modal */}
      {reviewModalData && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-soft-lg space-y-4">
            <h3 className="font-extrabold text-base text-brand-dark">Review Kitchen Response</h3>
            <p className="text-xs text-brand-muted">
              Record an internal operations follow-up note for{' '}
              <span className="font-bold text-brand-dark">{reviewModalData.restoName}</span>.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-brand-dark mb-1">Operations Follow-up Note</label>
                <textarea
                  rows={4}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="e.g. Verified kitchen capacity. Driver delivery window shifted by 15 mins to accommodate."
                  className="w-full p-3 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalData(null)}
                  className="flex-1 py-2.5 border border-brand-mint-border rounded-xl text-xs font-semibold text-brand-muted hover:bg-brand-mint-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="flex-1 py-2.5 bg-brand-forest text-white rounded-xl text-xs font-bold hover:bg-brand-forest-dark"
                >
                  {reviewing ? 'Saving...' : 'Mark as Reviewed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
