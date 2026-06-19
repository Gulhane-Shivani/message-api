import { Inbox, Send, Plus, LogOut, Mail } from 'lucide-react';

export default function Sidebar({ user, tab, setTab, unreadCount, onLogout }) {
  const initials = user.name?.[0] ?? '?';

  const navItems = [
    { id: 'inbox',   label: 'Inbox',       icon: Inbox, badge: unreadCount, badgeDanger: true },
    { id: 'sent',    label: 'Sent',         icon: Send,  badge: null },
    { id: 'compose', label: 'New Message',  icon: Plus,  badge: null },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen bg-slate-100 dark:bg-gray-950 border-r border-slate-200 dark:border-slate-800">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-glow-indigo flex-shrink-0">
          <Mail size={18} className="text-white" />
        </div>
        <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">PulseMail</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon, badge, badgeDanger }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`nav-item w-full ${tab === id ? 'active' : ''}`}
          >
            <span className="flex items-center gap-3">
              <Icon size={17} />
              <span>{label}</span>
            </span>
            {badge > 0 && (
              <span className={badgeDanger ? 'badge-danger' : 'badge-primary'}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Log out"
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
