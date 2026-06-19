import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './api.js';
import LoginPage   from './components/LoginPage.jsx';
import Sidebar     from './components/Sidebar.jsx';
import MessageList from './components/MessageList.jsx';
import ThreadPane  from './components/ThreadPane.jsx';
import ComposePage from './components/ComposePage.jsx';

export default function App() {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('pulsemail_user')); } catch { return null; }
  });
  const [users, setUsers]     = useState([]);
  const [tab, setTab]         = useState('inbox');
  const [messages, setMsgs]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load all users once (for compose)
  useEffect(() => {
    api.users().then(setUsers).catch(() => {});
  }, []);

  // Load messages whenever tab or user changes
  const loadMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = tab === 'inbox'
        ? await api.inbox(user.id)
        : await api.sent(user.id);
      setMsgs(data);
      setSelected(null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, tab]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Mark as read then open thread
  const handleSelect = async (msg) => {
    if (tab === 'inbox' && !msg.is_read) {
      api.markRead(msg.id).catch(() => {});
      setMsgs(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
    // Thread detail carries sender_id / receiver_id from the inbox/sent row
    setSelected(msg);
  };

  // Hide (delete) messages
  const handleHide = async (ids) => {
    const fn = tab === 'inbox' ? api.hideMessages : api.hideSent;
    await fn(ids, user.id).catch(() => {});
    setMsgs(prev => prev.filter(m => !ids.includes(m.id)));
    if (selected && ids.includes(selected.id)) setSelected(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('pulsemail_user');
    setUser(null); setMsgs([]); setSelected(null);
  };

  const unreadCount = useMemo(() =>
    tab === 'inbox' ? messages.filter(m => !m.is_read).length : 0,
    [messages, tab]);

  if (!user) return <LoginPage onLogin={u => { setUser(u); }} />;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-gray-950">
      <Sidebar
        user={user}
        tab={tab}
        setTab={t => { setTab(t); setSelected(null); }}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        {tab === 'compose' ? (
          <ComposePage
            currentUser={user}
            users={users}
            onSent={() => { setTab('sent'); }}
          />
        ) : (
          <>
            <MessageList
              tab={tab}
              messages={messages}
              selected={selected}
              loading={loading}
              onSelect={handleSelect}
              onHide={handleHide}
              onBulkHide={handleHide}
              onRefresh={loadMessages}
            />
            <ThreadPane
              message={selected}
              tab={tab}
              currentUser={user}
              onDelete={handleHide}
              onBack={() => setSelected(null)}
            />
          </>
        )}
      </div>
    </div>
  );
}
