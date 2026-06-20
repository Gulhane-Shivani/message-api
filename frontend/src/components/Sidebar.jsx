import { Users, MessageCircle, Bell, Search, LogOut } from 'lucide-react';

export default function Sidebar({ user, tab, setTab, notificationCount, chatUnreadCount, onLogout }) {
  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen bg-slate-900 text-slate-100 border-r border-slate-800">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
          <Users size={18} className="text-white" />
        </div>
        <div>
          <span className="text-lg font-extrabold text-white tracking-tight">PulseComm</span>
          <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Messaging Hub</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <button
          onClick={() => setTab('communities')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 text-sm font-semibold
            ${tab === 'communities'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
        >
          <span className="flex items-center gap-3">
            <Users size={18} />
            <span>Communities</span>
          </span>
        </button>

        <button
          onClick={() => setTab('chat')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 text-sm font-semibold
            ${tab === 'chat'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
        >
          <span className="flex items-center gap-3">
            <MessageCircle size={18} />
            <span>Chats</span>
          </span>
          {chatUnreadCount > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {chatUnreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('notifications')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 text-sm font-semibold
            ${tab === 'notifications'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
        >
          <span className="flex items-center gap-3">
            <Bell size={18} />
            <span>Notifications</span>
          </span>
          {notificationCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              {notificationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('search')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 text-sm font-semibold
            ${tab === 'search'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
        >
          <span className="flex items-center gap-3">
            <Search size={18} />
            <span>Search Database</span>
          </span>
        </button>
      </nav>

      {/* User profile footer */}
      <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Sign Out"
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all duration-150"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
