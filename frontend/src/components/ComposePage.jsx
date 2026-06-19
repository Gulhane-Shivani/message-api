import { useState, useMemo } from 'react';
import { Send, X, Check, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../api.js';

export default function ComposePage({ currentUser, users, onSent }) {
  const [recipients, setRecipients] = useState([]);
  const [subject, setSubject]       = useState('');
  const [body, setBody]             = useState('');
  const [search, setSearch]         = useState('');
  const [showDrop, setShowDrop]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const others = useMemo(() =>
    users.filter(u => u.id !== currentUser.id)
      .filter(u => !search.trim() || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())),
    [users, currentUser, search]);

  const addRecipient = u => {
    if (!recipients.find(r => r.id === u.id)) setRecipients(p => [...p, u]);
    setSearch(''); setShowDrop(false);
  };
  const removeRecipient = id => setRecipients(p => p.filter(r => r.id !== id));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!recipients.length) { setError('Select at least one recipient.'); return; }
    setLoading(true);
    try {
      const d = await api.sendMessage({ sender_id: currentUser.id, receiver_ids: recipients.map(r => r.id), subject, message: body });
      if (d.status === 'success') {
        setSuccess('Message sent!');
        setRecipients([]); setSubject(''); setBody('');
        setTimeout(onSent, 1200);
      } else { setError(d.message || 'Failed to send.'); }
    } catch { setError('Server connection error.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 min-w-0">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Message</h2>
        <p className="text-xs text-slate-400 mt-0.5">Send to one or more team members</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          {error && (
            <div className="alert-error animate-fade-in">
              <AlertCircle size={15} />{error}
            </div>
          )}
          {success && (
            <div className="alert-success animate-fade-in">
              <CheckCircle size={15} />{success}
            </div>
          )}

          {/* Recipients */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">To</label>
            <div className="relative">
              <div
                className="min-h-[46px] flex flex-wrap gap-2 items-center px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary-400/40 focus-within:border-primary-400 transition cursor-text"
                onClick={() => setShowDrop(true)}
              >
                {recipients.map(r => (
                  <span key={r.id} className="inline-flex items-center gap-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                    {r.name}
                    <button type="button" onClick={e => { e.stopPropagation(); removeRecipient(r.id); }} className="hover:text-red-500 transition-colors">
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)}
                  placeholder={recipients.length ? '' : 'Type a name or email…'}
                  className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
                />
              </div>

              {showDrop && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDrop(false)} />
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card-hover max-h-48 overflow-y-auto">
                    {others.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-4">No users found</p>
                      : others.map(u => {
                          const sel = recipients.some(r => r.id === u.id);
                          return (
                            <div key={u.id} onClick={() => addRecipient(u)}
                              className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors text-sm
                                ${sel ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                              <div>
                                <span className="font-semibold">{u.name}</span>
                                <span className="text-slate-400 text-xs ml-2">{u.email}</span>
                              </div>
                              {sel && <Check size={14} />}
                            </div>
                          );
                        })
                    }
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Subject</label>
            <input required value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary…"
              className="form-input" />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Message</label>
            <textarea required value={body} onChange={e => setBody(e.target.value)}
              rows={10} placeholder="Write your message here…"
              className="form-textarea" />
            <p className="text-[11px] text-slate-400 text-right mt-1">{body.length} chars</p>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading} className="btn-primary px-8">
              {loading ? <><Loader2 size={15} className="animate-spin" />Sending…</> : <><Send size={15} />Send Message</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
