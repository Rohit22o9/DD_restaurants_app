import React, { useEffect, useState } from 'react';
import {
  Upload,
  X,
  FileText,
  AlertTriangle,
  Clock,
  Eye,
  Send,
  Calendar,
  CheckSquare,
  HelpCircle,
  Smartphone,
  Plus,
  Trash2,
} from 'lucide-react';
import { UPDATE_CATEGORIES, PRIORITY_LEVELS, RESPONSE_TYPES } from '@dailydrop/shared';
import { adminApi } from '../services/api';

interface CreateUpdateProps {
  onSuccess: (updateId: string) => void;
  onCancel: () => void;
}

export const CreateUpdate: React.FC<CreateUpdateProps> = ({ onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(UPDATE_CATEGORIES[0]);
  const [priority, setPriority] = useState<string>('normal');
  const [message, setMessage] = useState('');
  const [responseType, setResponseType] = useState<string>('acknowledgement_only');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'selected'>('all');
  const [selectedRestoIds, setSelectedRestoIds] = useState<string[]>([]);
  const [availableRestos, setAvailableRestos] = useState<any[]>([]);

  // Response Config for Multiple Choice or Info
  const [mcOptions, setMcOptions] = useState<string[]>(['Accept scheduled slots', 'Request modified time']);
  const [promptQuestion, setPromptQuestion] = useState('Can your kitchen commit to this order quantity?');
  const [requiresQuantity, setRequiresQuantity] = useState(true);

  // Files
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);

  useEffect(() => {
    adminApi.getRestaurants({ status: 'active' }).then(res => {
      setAvailableRestos(res.data);
    }).catch(console.error);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles([...files, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const addMcOption = () => {
    setMcOptions([...mcOptions, `Option ${mcOptions.length + 1}`]);
  };

  const updateMcOption = (index: number, val: string) => {
    const updated = [...mcOptions];
    updated[index] = val;
    setMcOptions(updated);
  };

  const removeMcOption = (index: number) => {
    if (mcOptions.length <= 1) return;
    setFiles(files.filter((_, i) => i !== index));
    setMcOptions(mcOptions.filter((_, i) => i !== index));
  };

  const toggleRestoSelection = (id: string) => {
    if (selectedRestoIds.includes(id)) {
      setSelectedRestoIds(selectedRestoIds.filter(i => i !== id));
    } else {
      setSelectedRestoIds([...selectedRestoIds, id]);
    }
  };

  const handleSave = async (publishNow: boolean) => {
    setError(null);
    if (!title.trim() || !message.trim()) {
      setError('Update title and message instructions are required.');
      return;
    }

    if (targetType === 'selected' && selectedRestoIds.length === 0) {
      setError('Please select at least one targeted restaurant partner.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title,
        category,
        priority,
        message,
        responseType,
        targetType,
        targetRestaurantIds: targetType === 'selected' ? selectedRestoIds : undefined,
        deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        publishNow,
      };

      if (responseType === 'multiple_choice') {
        payload.responseConfig = { options: mcOptions.filter(o => o.trim()) };
      } else if (responseType === 'availability_confirmation') {
        payload.responseConfig = { requiresQuantity, promptQuestion };
      }

      const res = await adminApi.createUpdate(payload);
      const updateId = res.data.id;

      // Upload attachments if any
      if (files.length > 0) {
        await adminApi.uploadAttachments(updateId, files);
      }

      onSuccess(updateId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowConfirmPublish(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark tracking-tight">Create Operational Update</h1>
          <p className="text-xs text-brand-muted mt-1">
            Author and broadcast menu adjustments, prep quotas, and kitchen instructions to restaurant partners.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 border border-brand-mint-border bg-white text-brand-forest hover:bg-brand-mint-subtle rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Mobile Preview</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-brand-mint-border bg-white text-brand-muted hover:bg-brand-mint-subtle rounded-xl text-xs font-bold transition-all"
          >
            Cancel
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white border border-brand-mint-border rounded-3xl p-6 sm:p-8 shadow-soft space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
            Update Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Urgent: W43 Daily Pre-Order Quantity & Kitchen Capacity Confirmation"
            className="w-full px-4 py-2.5 bg-brand-mint-subtle/50 border border-brand-mint-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest text-brand-dark font-medium"
          />
        </div>

        {/* Category & Priority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
              Category *
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-brand-mint-subtle/50 border border-brand-mint-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-forest text-brand-dark font-medium"
            >
              {UPDATE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
              Priority Level *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_LEVELS.map(lvl => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setPriority(lvl)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-extrabold capitalize transition-all ${
                    priority === lvl
                      ? lvl === 'urgent'
                        ? 'bg-red-600 text-white shadow-soft'
                        : lvl === 'high'
                        ? 'bg-amber-500 text-white shadow-soft'
                        : lvl === 'important'
                        ? 'bg-brand-forest text-white shadow-soft'
                        : 'bg-emerald-700 text-white shadow-soft'
                      : 'bg-brand-mint-subtle border border-brand-mint-border text-brand-muted hover:bg-brand-mint'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Message / Instructions */}
        <div>
          <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
            Message & Operational Instructions *
          </label>
          <textarea
            rows={6}
            required
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Detail the order requirements, prep timings, batch quotas, and delivery handoff instructions here..."
            className="w-full p-4 bg-brand-mint-subtle/50 border border-brand-mint-border rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-forest text-brand-dark leading-relaxed font-sans"
          />
        </div>

        {/* Response Type Selector */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide">
            Required Restaurant Partner Action *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              { id: 'acknowledgement_only', label: 'Acknowledgement Only', desc: 'Partner confirms receipt and reading' },
              { id: 'availability_confirmation', label: 'Availability Confirmation', desc: 'Partner confirms full/partial/unavailable' },
              { id: 'multiple_choice', label: 'Multiple Choice Question', desc: 'Partner selects from custom options' },
              { id: 'info_request', label: 'Information Request', desc: 'Partner submits text and quantity constraints' },
              { id: 'announcement_only', label: 'General Announcement', desc: 'Informational only, no response required' },
            ].map(type => (
              <div
                key={type.id}
                onClick={() => setResponseType(type.id)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  responseType === type.id
                    ? 'border-brand-forest bg-brand-mint text-brand-forest shadow-soft-sm'
                    : 'border-brand-mint-border bg-white hover:bg-brand-mint-subtle text-brand-dark'
                }`}
              >
                <div className="text-xs font-bold">{type.label}</div>
                <div className="text-[11px] text-brand-muted mt-0.5">{type.desc}</div>
              </div>
            ))}
          </div>

          {/* Dynamic Config: Multiple Choice Options */}
          {responseType === 'multiple_choice' && (
            <div className="bg-brand-mint-subtle p-4 rounded-2xl border border-brand-mint-border space-y-2 mt-3">
              <label className="block text-xs font-bold text-brand-forest">Configured Choice Options:</label>
              {mcOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateMcOption(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-brand-mint-border rounded-xl text-xs bg-white text-brand-dark"
                  />
                  {mcOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMcOption(idx)}
                      className="p-1.5 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addMcOption}
                className="text-xs font-bold text-brand-forest hover:underline flex items-center space-x-1 pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Choice Option</span>
              </button>
            </div>
          )}

          {/* Dynamic Config: Availability confirmation question */}
          {responseType === 'availability_confirmation' && (
            <div className="bg-brand-mint-subtle p-4 rounded-2xl border border-brand-mint-border space-y-2 mt-3">
              <label className="block text-xs font-bold text-brand-forest">Kitchen Prompt Question:</label>
              <input
                type="text"
                value={promptQuestion}
                onChange={e => setPromptQuestion(e.target.value)}
                className="w-full px-3 py-1.5 border border-brand-mint-border rounded-xl text-xs bg-white text-brand-dark"
              />
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="reqQty"
                  checked={requiresQuantity}
                  onChange={e => setRequiresQuantity(e.target.checked)}
                  className="rounded text-brand-forest"
                />
                <label htmlFor="reqQty" className="text-xs text-brand-dark font-medium cursor-pointer">
                  Prompt for daily maximum batch capacity number
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Deadlines & Scheduling Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-brand-mint-border">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
              Response Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              value={deadlineAt}
              onChange={e => setDeadlineAt(e.target.value)}
              className="w-full px-3 py-2 bg-brand-mint-subtle/50 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
              Schedule Publication (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 bg-brand-mint-subtle/50 border border-brand-mint-border rounded-xl text-xs text-brand-dark"
            />
          </div>
        </div>

        {/* Targeting Restaurants */}
        <div className="space-y-3 pt-2 border-t border-brand-mint-border">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-brand-dark uppercase tracking-wide">
              Target Audience
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold ${
                  targetType === 'all'
                    ? 'bg-brand-forest text-white'
                    : 'bg-brand-mint-subtle border border-brand-mint-border text-brand-muted'
                }`}
              >
                All Active Restaurants ({availableRestos.length})
              </button>
              <button
                type="button"
                onClick={() => setTargetType('selected')}
                className={`px-3 py-1 rounded-xl text-xs font-bold ${
                  targetType === 'selected'
                    ? 'bg-brand-forest text-white'
                    : 'bg-brand-mint-subtle border border-brand-mint-border text-brand-muted'
                }`}
              >
                Select Specific Restaurants
              </button>
            </div>
          </div>

          {targetType === 'selected' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-brand-mint-subtle rounded-2xl border border-brand-mint-border">
              {availableRestos.map(r => (
                <label
                  key={r.id}
                  className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-brand-mint-border cursor-pointer hover:bg-brand-mint/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedRestoIds.includes(r.id)}
                    onChange={() => toggleRestoSelection(r.id)}
                    className="rounded text-brand-forest"
                  />
                  <div className="text-xs font-bold text-brand-dark leading-tight">
                    {r.name}
                    <div className="text-[10px] text-brand-muted font-mono">{r.code}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Secure Attachments Upload */}
        <div className="space-y-3 pt-2 border-t border-brand-mint-border">
          <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide">
            Attach Operational Documents (PDF, XLSX, CSV, DOCX, Images)
          </label>
          <div className="border-2 border-dashed border-brand-mint-border rounded-2xl p-6 text-center hover:bg-brand-mint-subtle/50 transition-colors">
            <Upload className="w-8 h-8 mx-auto text-brand-forest mb-2" />
            <div className="text-xs font-bold text-brand-dark">Drag and drop files here, or click to browse</div>
            <div className="text-[11px] text-brand-muted mt-1">
              Supports spreadsheets, meal schedules, quality checklists up to 25MB each
            </div>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="fileInput"
              accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg"
            />
            <label
              htmlFor="fileInput"
              className="mt-3 inline-block px-4 py-2 bg-white border border-brand-mint-border rounded-xl text-xs font-bold text-brand-forest hover:bg-brand-mint cursor-pointer shadow-soft-sm"
            >
              Select Attachment Files
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-brand-mint-subtle border border-brand-mint-border rounded-xl text-xs font-medium"
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-brand-forest" />
                    <span className="font-bold text-brand-dark">{file.name}</span>
                    <span className="text-[10px] text-brand-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-brand-mint-border">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-brand-mint-border hover:bg-brand-mint-subtle text-brand-dark rounded-xl text-xs font-bold transition-all"
          >
            {scheduledAt ? 'Schedule Update' : 'Save as Draft'}
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmPublish(true)}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-forest hover:bg-brand-forest-dark text-white rounded-xl text-xs font-bold shadow-soft flex items-center justify-center space-x-2 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Publish Update to Partners</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmPublish && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-soft-lg space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-mint text-brand-forest flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-brand-dark">Confirm Broadcast</h3>
              <p className="text-xs text-brand-muted">
                Publishing will broadcast this update immediately to{' '}
                <span className="font-bold text-brand-dark">
                  {targetType === 'all' ? `all ${availableRestos.length} active restaurants` : `${selectedRestoIds.length} selected restaurants`}
                </span>
                . In-app notifications and email alerts will be dispatched.
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmPublish(false)}
                className="flex-1 py-2.5 border border-brand-mint-border rounded-xl text-xs font-semibold text-brand-muted hover:bg-brand-mint-subtle"
              >
                Review Again
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={loading}
                className="flex-1 py-2.5 bg-brand-forest text-white rounded-xl text-xs font-bold hover:bg-brand-forest-dark flex items-center justify-center space-x-1"
              >
                {loading ? 'Publishing...' : 'Yes, Broadcast Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Live Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] max-w-sm w-full border-4 border-brand-dark p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-brand-mint-border pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-brand-forest">
                <Smartphone className="w-4 h-4" />
                <span>Partner Mobile App Preview</span>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-brand-muted hover:text-brand-dark">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Mobile Card */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-brand-mint text-brand-forest'
                }`}>
                  {priority}
                </span>
                <span className="text-[11px] text-brand-muted">{category}</span>
              </div>

              <h3 className="font-extrabold text-sm text-brand-dark">{title || 'Update Title Preview'}</h3>

              {deadlineAt && (
                <div className="text-[11px] text-amber-700 font-semibold bg-amber-50 p-2 rounded-xl">
                  Deadline: {new Date(deadlineAt).toLocaleString()}
                </div>
              )}

              <p className="text-xs text-brand-dark/90 leading-relaxed whitespace-pre-wrap">
                {message || 'Instructions preview...'}
              </p>

              {files.length > 0 && (
                <div className="p-3 bg-brand-mint-subtle rounded-xl border border-brand-mint-border space-y-1">
                  <div className="text-[11px] font-bold text-brand-forest">Attachment ({files.length}):</div>
                  {files.map((f, i) => (
                    <div key={i} className="text-[11px] text-brand-dark truncate">
                      📎 {f.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <div className="w-full py-2.5 bg-brand-forest text-white rounded-xl text-xs font-bold text-center">
                  {responseType === 'acknowledgement_only' ? 'Acknowledge Update' : 'Submit Response'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
