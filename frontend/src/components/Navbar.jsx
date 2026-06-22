import { Users, MessageCircle, Bell, Search, Settings, LogOut } from 'lucide-react';

export default function Navbar({ user, tab, setTab, notificationCount, chatUnreadCount, onLogout }) {
  return (
    <nav className="h-[68px] w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-6 flex-shrink-0 z-50 shadow-sm">
      {/* Left: Brand / Logo */}
      <div className="flex items-center gap-3 min-w-fit">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0 hover:scale-105 transition-transform">
          <Users size={20} className="text-white" />
        </div>
        <div>
          <span className="text-base font-black text-slate-800 dark:text-white tracking-tight">Messaging Hub</span>
          <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold tracking-widest uppercase -mt-0.5">Workspace</p>
        </div>
      </div>

      {/* Middle: Navigation Links */}
      <div className="flex items-center gap-1">
        <NavBtn label="Communities" icon={<Users size={15} />} active={tab === 'communities'} onClick={() => setTab('communities')} />
        <NavBtn label="Chats" icon={<MessageCircle size={15} />} active={tab === 'chat'} onClick={() => setTab('chat')} badge={chatUnreadCount} badgeColor="bg-emerald-500" />
        <NavBtn label="Notifications" icon={<Bell size={15} />} active={tab === 'notifications'} onClick={() => setTab('notifications')} badge={notificationCount} badgeColor="bg-rose-500" pulse />
        <NavBtn label="Search" icon={<Search size={15} />} active={tab === 'search'} onClick={() => setTab('search')} />
        <NavBtn label="Admin Portal" icon={<Settings size={15} />} active={tab === 'admin'} onClick={() => setTab('admin')} />
      </div>

      {/* Right: Profile & Logout */}
      <div className="flex items-center gap-3 min-w-fit">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/40">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name}
              className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-400/20 flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">{user.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{user.email}</p>
          </div>
        </div>

        <button onClick={onLogout} title="Sign Out"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200/60 dark:border-slate-800/60 hover:border-rose-200 dark:hover:border-rose-900/30 transition-all duration-200">
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  );
}

function NavBtn({ label, icon, active, onClick, badge, badgeColor, pulse }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-px active:scale-95
        ${active
          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20'
          : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-900'
        }`}
    >
      {icon}
      <span>{label}</span>
      {badge > 0 && (
        <span className={`absolute -top-1.5 -right-1 ${badgeColor} text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-950 shadow ${pulse ? 'animate-pulse' : ''}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
