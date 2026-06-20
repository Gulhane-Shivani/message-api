import { useState, useEffect } from 'react';
import { api, fmtDate } from '../api.js';
import { 
  Bell, Mail, MessageSquare, AtSign, Compass, CheckCircle2, 
  Trash2, Eye, ShieldAlert, AlertCircle, Loader2
} from 'lucide-react';

export default function NotificationsView() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      await api.markNotificationRead(notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(n => api.markNotificationRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={20} className="text-indigo-500" />
            <span>Notifications Hub</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Real-time alerts, messages, and mentions</p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-650 dark:text-slate-350 transition-colors"
        >
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm max-w-lg mx-auto max-h-[300px] mt-12">
          <Bell size={40} className="text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">All caught up!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">You have no active notifications. We will alert you when you receive new posts or comments.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 max-w-3xl mx-auto w-full">
          {notifications.map(notif => {
            let Icon = Bell;
            let iconColor = 'bg-slate-100 dark:bg-slate-900 text-slate-500';
            
            if (notif.type === 'new_message') {
              Icon = Mail;
              iconColor = 'bg-blue-50 dark:bg-blue-950/30 text-blue-500';
            } else if (notif.type === 'new_post') {
              Icon = Compass;
              iconColor = 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500';
            } else if (notif.type === 'new_comment') {
              Icon = MessageSquare;
              iconColor = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500';
            } else if (notif.type === 'mention') {
              Icon = AtSign;
              iconColor = 'bg-rose-50 dark:bg-rose-950/30 text-rose-500';
            } else if (notif.type === 'community_invite') {
              Icon = Bell;
              iconColor = 'bg-amber-50 dark:bg-amber-950/30 text-amber-500';
            }

            return (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id)}
                className={`p-4 rounded-2xl border transition-all duration-150 flex items-start gap-4 cursor-pointer
                  ${notif.is_read
                    ? 'bg-white/60 dark:bg-gray-950/40 border-slate-150 dark:border-slate-850 text-slate-500 dark:text-slate-400'
                    : 'bg-white dark:bg-gray-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-indigo-500/5'
                  }`}
              >
                {/* Notification Type Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                  <Icon size={16} />
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold capitalize tracking-wide text-indigo-550 dark:text-indigo-400">{notif.type.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-400">{fmtDate(notif.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold mt-1 leading-relaxed">{notif.message}</p>
                </div>

                {/* Unread dot */}
                {!notif.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 flex-shrink-0 mt-2.5 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
