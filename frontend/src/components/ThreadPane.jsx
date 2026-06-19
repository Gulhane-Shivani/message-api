import { useState, useEffect } from 'react';
import { CornerDownLeft, Trash2, ChevronLeft, Loader2, Mail } from 'lucide-react';
import { api, fmtDate } from '../api.js';

function Avatar({ name, className = '' }) {
  return (
    <div className={`w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold flex-shrink-0 ${className}`}>
      {name?.[0] ?? '?'}
    </div>
  );
}

export default function ThreadPane({ message, tab, currentUser, onDelete, onBack }) {
  const [replies, setReplies]   = useState([]);
  const [reply, setReply]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!message) { setReplies([]); return; }
    setLoading(true); setError('');
    api.thread(message.id)
      .then(d => setReplies(d.replies || []))
      .catch(() => setError('Failed to load thread.'))
      .finally(() => setLoading(false));
  }, [message]);

  const sendReply = async e => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true); setError('');
    const receiverId = message.sender_id === currentUser.id
      ? message.receiver_id
      : message.sender_id;
    try {
      const d = await api.sendReply({ message_id: message.id, sender_id: currentUser.id, receiver_id: receiverId, message: reply });
      if (d.success) {
        setReply('');
        const fresh = await api.thread(message.id);
        setReplies(fresh.replies || []);
      } else { setError(d.message || 'Reply failed.'); }
    } catch { setError('Could not send reply.'); }
    finally { setSending(false); }
  };

  if (!message) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-300 dark:text-slate-700 bg-slate-50 dark:bg-gray-950">
        <Mail size={56} />
        <p className="text-base font-semibold">Select a message to read</p>
      </div>
    );
  }

  const contactName = tab === 'inbox' ? message.sender_name : message.receiver_name;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-gray-950 min-w-0">
      {/* Thread header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="md:hidden btn-icon flex-shrink-0"><ChevronLeft size={16} /></button>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{message.subject}</h2>
            <p className="text-xs text-slate-400">
              {tab === 'inbox' ? 'From' : 'To'}: <span className="font-semibold">{contactName}</span>
              <span className="mx-1.5">·</span>{fmtDate(message.created_at)}
            </p>
          </div>
        </div>
        <button onClick={() => onDelete([message.id])} className="btn-icon hover:text-red-500 hover:border-red-300 flex-shrink-0">
          <Trash2 size={15} />
        </button>
      </div>

      {/* Scrollable thread body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {error && <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</div>}

        {/* Original message bubble */}
        <div className="card p-5 border-l-4 border-l-primary-500 animate-fade-in">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Avatar name={message.sender_name} />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{message.sender_name}</span>
            </div>
            <span className="text-[11px] text-slate-400">{new Date(message.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{message.message}</p>
        </div>

        {/* Replies */}
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-primary-400" /></div>
        ) : replies.map(r => (
          <div key={r.id} className="card p-4 ml-6 animate-fade-in">
            <div className="flex items-center justify-between mb-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Avatar name={r.sender_name} className="w-7 h-7 text-[11px]" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.sender_name}</span>
              </div>
              <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{r.message}</p>
          </div>
        ))}
      </div>

      {/* Reply form */}
      <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={sendReply} className="flex flex-col gap-3">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder={`Reply to ${message.sender_name === currentUser.name ? contactName : message.sender_name}…`}
            rows={3}
            className="form-textarea text-sm"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={sending || !reply.trim()} className="btn-primary px-5 py-2.5 text-sm">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
              {sending ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
