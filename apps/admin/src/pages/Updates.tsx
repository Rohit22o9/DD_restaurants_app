import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Radio,
  FileText,
  Clock,
  ArrowRight,
  Archive,
  Send,
  PlusCircle,
  Paperclip,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface UpdatesProps {
  onNavigate: (tab: string, updateId?: string) => void;
}

export const Updates: React.FC<UpdatesProps> = ({ onNavigate }) => {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUpdates({
        status: statusFilter,
        priority: priorityFilter,
        search,
      });
      setUpdates(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [statusFilter, priorityFilter, search]);

  const handlePublish = async (id: string) => {
    try {
      await adminApi.publishUpdate(id);
      fetchUpdates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await adminApi.archiveUpdate(id);
      fetchUpdates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark tracking-tight">Update Broadcasts</h1>
          <p className="text-xs text-brand-muted mt-1">
            Browse published briefings, drafts, scheduled announcements, and archive history.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create-update')}
          className="px-4 py-2.5 bg-brand-forest hover:bg-brand-forest-dark text-white rounded-xl text-xs font-bold shadow-soft flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Update</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs">
          {error}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search updates by title or message keyword..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-brand-mint-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-forest text-brand-dark"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'published', 'scheduled', 'draft', 'archived'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-brand-forest text-white'
                  : 'bg-white border border-brand-mint-border text-brand-muted hover:bg-brand-mint-subtle'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Updates Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-brand-muted bg-white rounded-2xl border border-brand-mint-border">
            Loading operational updates...
          </div>
        ) : updates.length === 0 ? (
          <div className="py-12 text-center text-xs text-brand-muted bg-white rounded-2xl border border-brand-mint-border">
            No updates found matching your filter criteria.
          </div>
        ) : (
          updates.map(u => {
            const responseRate =
              u.metrics?.targetedCount > 0
                ? Math.round((u.metrics.responseSubmittedCount / u.metrics.targetedCount) * 100)
                : 0;

            return (
              <div
                key={u.id}
                className="bg-white border border-brand-mint-border rounded-2xl p-5 shadow-soft hover:border-brand-forest/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
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

                    <span className="text-xs font-semibold text-brand-muted">{u.category}</span>

                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                        u.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : u.status === 'draft'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.status}
                    </span>

                    {u.attachmentCount > 0 && (
                      <span className="text-[11px] text-brand-forest font-bold flex items-center space-x-1 bg-brand-mint px-2 py-0.5 rounded-full">
                        <Paperclip className="w-3 h-3" />
                        <span>{u.attachmentCount} Attachment</span>
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => onNavigate('tracking', u.id)}
                    className="font-extrabold text-base text-brand-dark hover:text-brand-forest cursor-pointer transition-colors"
                  >
                    {u.title}
                  </h3>

                  <p className="text-xs text-brand-muted line-clamp-2 leading-relaxed">
                    {u.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-brand-muted pt-1">
                    <span>Created: {new Date(u.createdAt).toLocaleDateString()}</span>
                    {u.deadlineAt && (
                      <span className="text-amber-800 font-semibold flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Deadline: {new Date(u.deadlineAt).toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Tracking Progress & Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-brand-mint-border">
                  {u.status === 'published' && (
                    <div className="w-40 text-right">
                      <div className="flex justify-between text-[11px] font-bold text-brand-dark mb-1">
                        <span>Kitchen Responses</span>
                        <span>{u.metrics?.responseSubmittedCount || 0}/{u.metrics?.targetedCount || 0}</span>
                      </div>
                      <div className="w-full bg-brand-mint-subtle h-2 rounded-full overflow-hidden border border-brand-mint-border">
                        <div
                          className="bg-brand-forest h-full rounded-full transition-all duration-300"
                          style={{ width: `${responseRate}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    {u.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(u.id)}
                        className="px-3 py-1.5 bg-brand-forest hover:bg-brand-forest-dark text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publish</span>
                      </button>
                    )}

                    {u.status === 'published' && (
                      <>
                        <button
                          onClick={() => onNavigate('tracking', u.id)}
                          className="px-3 py-1.5 bg-brand-forest text-white rounded-xl text-xs font-bold hover:bg-brand-forest-dark transition-all flex items-center space-x-1"
                        >
                          <span>Track Status</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(u.id)}
                          title="Archive Update"
                          className="p-1.5 text-brand-muted hover:text-brand-dark rounded-xl border border-brand-mint-border"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
