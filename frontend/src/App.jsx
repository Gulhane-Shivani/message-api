import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import LoginPage from './components/LoginPage.jsx';
import Navbar from './components/Navbar.jsx';
import CommunitiesView from './components/CommunitiesView.jsx';
import ChatView from './components/ChatView.jsx';
import NotificationsView from './components/NotificationsView.jsx';
import SearchView from './components/SearchView.jsx';
import AdminView from './components/AdminView.jsx';
import CoursesView from './components/CoursesView.jsx';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pulsemail_user') || 'null');
    } catch {
      return null;
    }
  });

  const [tab, setTab] = useState('communities');
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // States for search click redirection
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedCommunity, setSelectedCommunity] = useState(null);

  // Load counts for notification and chat badges
  const loadBadges = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch unread notifications
      const notifs = await api.getNotifications();
      const unreadNotifs = notifs.filter(n => !n.is_read).length;
      setNotificationCount(unreadNotifs);

      // 2. Fetch unread messages count
      const convs = await api.getConversations();
      const totalUnreadChat = convs.reduce((acc, c) => acc + (c.unread_count || 0), 0);
      setChatUnreadCount(totalUnreadChat);
    } catch (e) {
      console.error('Error fetching badges:', e);
    }
  }, [user]);

  // Periodic badge checking
  useEffect(() => {
    loadBadges();
    const interval = setInterval(loadBadges, 6000);
    return () => clearInterval(interval);
  }, [loadBadges]);

  const handleLogout = () => {
    localStorage.removeItem('pulsemail_user');
    setUser(null);
  };

  // Callback to start DM chat from Search
  const handleStartChatFromSearch = async (otherUser) => {
    try {
      // Create/Get conversation
      const conv = await api.getOrCreateConversation('one_to_one', otherUser.id);
      setSelectedConversation(conv);
      setTab('chat');
    } catch (e) {
      console.error(e);
    }
  };

  // Callback to view community from Search
  const handleViewCommunityFromSearch = (community) => {
    setSelectedCommunity(community);
    setTab('communities');
  };

  if (!user) {
    return <LoginPage onLogin={(u) => setUser(u)} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-gray-900 font-sans">
      <Navbar
        user={user}
        tab={tab}
        setTab={setTab}
        notificationCount={notificationCount}
        chatUnreadCount={chatUnreadCount}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {tab === 'communities' && (
          <CommunitiesView 
            currentUser={user} 
            initialCommunity={selectedCommunity} 
            clearInitialCommunity={() => setSelectedCommunity(null)} 
            onSelectConversation={(conv) => {
              setSelectedConversation(conv);
              setTab('chat');
            }}
          />
        )}
        {tab === 'chat' && (
          <ChatView 
            currentUser={user} 
            initialConversation={selectedConversation} 
            clearInitialConversation={() => setSelectedConversation(null)} 
          />
        )}
        {tab === 'notifications' && <NotificationsView />}
        {tab === 'search' && (
          <SearchView
            onStartChat={handleStartChatFromSearch}
            onViewCommunity={handleViewCommunityFromSearch}
          />
        )}
        {tab === 'admin' && (
          <AdminView
            currentUser={user}
            onViewCommunity={handleViewCommunityFromSearch}
          />
        )}
        {tab === 'courses' && (
          <CoursesView
            currentUser={user}
            onViewCommunity={handleViewCommunityFromSearch}
          />
        )}
      </main>
    </div>
  );
}
