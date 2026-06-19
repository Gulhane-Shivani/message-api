import { useState } from 'react';
import { Search, RefreshCw, Trash2, CornerDownLeft, Inbox as InboxIcon, Send as SendIcon } from 'lucide-react';
import { fmtDate } from '../api.js';

export default function MessageList({ tab, messages, selected, onSelect, onHide, onBulkHide, onRefresh, loading }) {
  const [query, setQuery]         = useState('');
  const [checked, setChecked]     = useState(new Set());

  const filtered = query.trim()
    ? messages.filter(m => {
        const q = query.toLowerCase();
        return (m.subject||'').toLowerCase().includes(q)
          || (m.message||'').toLowerCase().includes(q)
          || (m.sender_name||'').toLowerCase().includes(q)
          || (m.receiver_name||'').toLowerCase().includes(q);
      })
    : messages;

  const toggle = (id, e) => {
    e.stopPropagation();
    setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const bulkDelete = async () => {
    await onBulkHide([...checked]);
    setChecked(new Set());
  };

  const EmptyIcon = tab === 'inbox' ? InboxIcon : SendIcon;

  return (
    <div className="w-80 flex-shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">{tab}</h2>
          <button onClick={onRefresh} className="btn-icon" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin-slow' : ''} />
          </button>
        </div>

        {/* Bulk bar */}
        {checked.size > 0 && (
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 animate-fade-in">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">{checked.size} selected</span>
            <button onClick={bulkDelete} className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search messages…"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 transition"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-slate-600 py-16">
            <EmptyIcon size={40} />
            <p className="text-sm font-medium">No messages</p>
          </div>
        ) : filtered.map(msg => {
          const isUnread   = tab === 'inbox' && !msg.is_read;
          const isSelected = selected?.id === msg.id;
          const isChecked  = checked.has(msg.id);
          const contactName = tab === 'inbox' ? msg.sender_name : msg.receiver_name;
          return (
            <div
              key={msg.id}
              onClick={() => onSelect(msg)}
              className={`flex gap-2.5 px-3 py-3.5 cursor-pointer group transition-colors relative
                ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-l-primary-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}
              `}
            >
              {/* Checkbox */}
              <div className="flex-shrink-0 pt-0.5" onClick={e => toggle(msg.id, e)}>
                <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center
                  ${isChecked ? 'bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-primary-400'}`}>
                  {isChecked && <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-300'}`}>
                    {contactName}
                  </span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{fmtDate(msg.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0 animate-pulse-dot" />}
                  <p className={`text-xs truncate ${isUnread ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {msg.subject}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{msg.message}</p>
                <div className="flex items-center justify-between mt-1.5">
                  {tab === 'inbox' && parseInt(msg.reply_count) > 0
                    ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        <CornerDownLeft size={9} />{msg.reply_count}
                      </span>
                    : <span />
                  }
                  <button
                    onClick={e => { e.stopPropagation(); onHide([msg.id]); }}
                    className="opacity-0 group-hover:opacity-100 btn-ghost p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
