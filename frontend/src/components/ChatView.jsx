import { useState, useEffect, useRef } from 'react';
import { api, fmtDate, WS_BASE_URL } from '../api.js';
import { 
  Search, MessageSquare, Send, Image, Video, Paperclip, Pin, X, Check, CheckCheck,
  Smile, User, Users, Info, ChevronDown, Award, Sparkles, Loader2
} from 'lucide-react';

export default function ChatView({ currentUser, initialConversation, clearInitialConversation }) {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  
  // UI States
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [usersSearch, setUsersSearch] = useState('');
  
  // Typing indicator
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState({}); // convId -> {userId: bool}
  
  // Online Statuses
  const [onlineUsers, setOnlineUsers] = useState({}); // userId -> bool

  // Media upload
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Group creation
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('group'); // 'group' | 'batch' | 'project'

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  // Keep a ref to activeConv so the WS onmessage handler always sees the latest value
  const activeConvRef = useRef(null);

  // Sync ref whenever activeConv changes
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // 1. Fetch conversations list on mount
  useEffect(() => {
    loadConversations();
    loadUsers();
  }, []);

  useEffect(() => {
    if (initialConversation) {
      handleSelectConversation(initialConversation);
      clearInitialConversation();
    }
  }, [initialConversation]);

  // 2. Establish WebSocket connection ONCE per user login (not on every activeConv change)
  useEffect(() => {
    if (!currentUser) return;
    
    const wsUrl = `${WS_BASE_URL}/${currentUser.id}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WS Connection Established');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentActiveConv = activeConvRef.current; // always up-to-date
      
      if (data.type === 'new_message') {
        // Skip messages sent by self — already shown via optimistic update
        if (data.message.sender_id === currentUser.id) {
          loadConversations();
          return;
        }
        if (currentActiveConv && data.conversation_id === currentActiveConv.id) {
          setMessages(prev => [...prev, data.message]);
          scrollToBottom();
          sendReadReceipt(currentActiveConv.id, data.message.id);
        }
        loadConversations();
      } 
      else if (data.type === 'typing') {
        const { conversation_id, user_id, is_typing } = data;
        setOtherUserTyping(prev => ({
          ...prev,
          [conversation_id]: { ...prev[conversation_id], [user_id]: is_typing }
        }));
      } 
      else if (data.type === 'online_status') {
        const { user_id, status } = data;
        setOnlineUsers(prev => ({ ...prev, [user_id]: status }));
        loadConversations();
      }
      else if (data.type === 'read_receipt') {
        const { conversation_id, message_id } = data;
        if (currentActiveConv && conversation_id === currentActiveConv.id) {
          setMessages(prev => prev.map(m => m.id === message_id ? { ...m, is_read: true } : m));
        }
      }
    };

    ws.onclose = () => console.log('WS Connection Closed');

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [currentUser]); // Only reconnect when user changes, not on every conv select

  // Scroll to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async (search = '') => {
    try {
      const data = await api.getUsers(search);
      setUsersList(data);
      // Map initial online statuses
      const statuses = {};
      data.forEach(u => {
        statuses[u.id] = u.online_status;
      });
      setOnlineUsers(prev => ({ ...prev, ...statuses }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectConversation = async (conv) => {
    setActiveConv(conv);
    setMessages([]);
    try {
      const msgData = await api.getMessages(conv.id);
      setMessages(msgData);
      scrollToBottom();

      // Send read receipts for any unread message
      const unreadMsgs = msgData.filter(m => !m.is_read && m.sender_id !== currentUser.id);
      if (unreadMsgs.length > 0) {
        unreadMsgs.forEach(m => {
          sendReadReceipt(conv.id, m.id);
        });
        loadConversations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- WebSocket Outgoing Handlers ---
  const handleTyping = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !activeConv) return;

    if (!isTyping) {
      setIsTyping(true);
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: activeConv.id,
        is_typing: true
      }));
    }

    // Debounce clear typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          conversation_id: activeConv.id,
          is_typing: false
        }));
      }
    }, 1500);
  };

  const sendReadReceipt = (convId, msgId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'read_receipt',
        conversation_id: convId,
        message_id: msgId
      }));
    }
  };

  // --- Message Actions ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessageText.trim();
    if (!text || !activeConv) return;

    // Clear input immediately for snappy UX
    setNewMessageText('');

    // Optimistically append so message appears instantly for the sender
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar_url,
      content: text,
      message_type: 'text',
      file_url: null,
      is_read: false,
      is_pinned: false,
      created_at: new Date().toISOString(),
      reactions: []
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'typing', conversation_id: activeConv.id, is_typing: false }));
      }
    }

    try {
      const msg = await api.sendMessage(activeConv.id, text, 'text');
      // Replace temp with real server message (gets confirmed ID)
      setMessages(prev => prev.map(m => m.id === tempId
        ? { ...tempMsg, id: msg.id ?? tempId, created_at: msg.created_at ?? tempMsg.created_at }
        : m
      ));
      loadConversations();
    } catch (err) {
      console.error(err);
      // Roll back optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  // --- Media Message Upload ---
  const handleAttachFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConv) return;
    setUploading(true);
    setUploadError('');
    try {
      const res = await api.uploadFile(file);
      // Send message with file URL
      await api.sendMessage(activeConv.id, file.name, res.type, res.url);
      
      const updated = await api.getMessages(activeConv.id);
      setMessages(updated);
      scrollToBottom();
      loadConversations();
    } catch (err) {
      setUploadError('Attachment failed');
    } finally {
      setUploading(false);
    }
  };

  // --- Message reactions ---
  const handleReactToMessage = async (msgId, reaction) => {
    try {
      await api.reactToMessage(msgId, reaction);
      // Reload message list
      const updated = await api.getMessages(activeConv.id);
      setMessages(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Message Pinning ---
  const handlePinMessage = async (msgId) => {
    try {
      await api.pinMessage(msgId);
      const updated = await api.getMessages(activeConv.id);
      setMessages(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Start New DM Chat ---
  const handleStartDM = async (otherUser) => {
    try {
      const conv = await api.getOrCreateConversation('one_to_one', otherUser.id);
      setShowNewChatModal(false);
      loadConversations();
      handleSelectConversation(conv);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Create Group / Project / Batch Chat ---
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      const conv = await api.getOrCreateConversation(groupType, null, groupName.trim());
      setGroupName('');
      setShowGroupModal(false);
      loadConversations();
      handleSelectConversation(conv);
    } catch (e) {
      console.error(e);
    }
  };

  const pinnedMessages = messages.filter(m => m.is_pinned);
  
  // Find other typing users in active conversation
  const activeTypingUsers = activeConv && otherUserTyping[activeConv.id] 
    ? Object.keys(otherUserTyping[activeConv.id])
        .filter(uid => otherUserTyping[activeConv.id][uid])
        .map(uid => usersList.find(u => u.id === parseInt(uid))?.name || 'Someone')
    : [];

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-gray-900">
      {/* 1. Left Panel: Conversations List */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-950 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Messages</h2>
            <div className="flex gap-1.5">
              <button
                onClick={() => setShowGroupModal(true)}
                className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-colors"
                title="Create Group"
              >
                + Group
              </button>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                title="New Chat"
              >
                New DM
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              type="text"
              placeholder="Search chat history..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Conversations scroll area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(c => {
            const isTypingNow = otherUserTyping[c.id] && Object.values(otherUserTyping[c.id]).some(val => val);
            return (
              <div
                key={c.id}
                onClick={() => handleSelectConversation(c)}
                className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 border transition-all duration-150 relative
                  ${activeConv?.id === c.id 
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-850' 
                    : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={c.avatar_url}
                    alt={c.name}
                    className="w-10 h-10 rounded-full object-cover bg-slate-100"
                  />
                  {c.type === 'one_to_one' && (
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-950
                      ${onlineUsers[c.id] || c.online_status ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{c.name}</h4>
                    {c.last_message && (
                      <span className="text-[9px] text-slate-400 font-semibold">{fmtDate(c.last_message.created_at)}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    {isTypingNow ? (
                      <p className="text-[10px] text-indigo-500 font-bold animate-pulse">Typing...</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate pr-4">
                        {c.last_message ? (
                          <span>
                            {c.last_message.sender_id === currentUser.id ? 'You: ' : ''}
                            {c.last_message.content}
                          </span>
                        ) : (
                          <span className="italic">No messages yet</span>
                        )}
                      </p>
                    )}
                    {c.unread_count > 0 && (
                      <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Middle Panel: Messages History */}
      {activeConv ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/50">
          {/* Active chat header */}
          <div className="bg-white dark:bg-gray-950 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={activeConv.avatar_url}
                alt={activeConv.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-white">{activeConv.name}</h3>
                <p className="text-[10px] text-slate-400">
                  {activeConv.type === 'one_to_one' ? (
                    onlineUsers[activeConv.id] || activeConv.online_status ? (
                      <span className="text-emerald-500 font-bold">Online</span>
                    ) : 'Offline'
                  ) : (
                    <span className="capitalize">{activeConv.type} Chat</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-400 hover:text-slate-600">
              <Info size={18} className="cursor-pointer" />
            </div>
          </div>

          {/* Pinned Messages Header bar */}
          {pinnedMessages.length > 0 && (
            <div className="bg-amber-50/75 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 px-5 py-2.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <Pin size={12} className="rotate-45" />
                <span className="font-semibold">Pinned Message:</span>
                <span className="truncate max-w-lg italic">"{pinnedMessages[pinnedMessages.length - 1].content}"</span>
              </div>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded font-bold">{pinnedMessages.length} Pinned</span>
            </div>
          )}

          {/* Message scroll list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === currentUser.id;
              return (
                <div key={msg.id} className={`flex gap-3 max-w-lg ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                  {!isMe && (
                    <img
                      src={msg.sender_avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
                    />
                  )}
                  
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5 justify-end flex-row-reverse">
                      <span className="text-[10px] text-slate-400">{fmtDate(msg.created_at)}</span>
                      {!isMe && <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350">{msg.sender_name}</span>}
                    </div>

                    {/* Bubble Content */}
                    <div className={`p-3 rounded-2xl border text-sm relative group transition-all
                      ${isMe 
                        ? 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-gray-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {/* Pin indicator overlay */}
                      {msg.is_pinned && (
                        <div className={`absolute top-2 right-2 ${isMe ? 'text-indigo-200' : 'text-amber-500'}`} title="Pinned">
                          <Pin size={11} className="rotate-45" />
                        </div>
                      )}

                      {/* Content Render */}
                      {msg.message_type === 'text' && (
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}
                      {msg.message_type === 'image' && (
                        <div className="rounded-lg overflow-hidden max-w-xs border border-black/10 bg-black">
                          <img src={msg.file_url} alt="" className="max-h-60 w-full object-contain cursor-pointer" />
                        </div>
                      )}
                      {msg.message_type === 'video' && (
                        <div className="rounded-lg overflow-hidden max-w-xs border border-black/10 bg-black">
                          <video src={msg.file_url} controls className="max-h-60 w-full object-contain" />
                        </div>
                      )}

                      {/* Reaction bar */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="absolute -bottom-2 right-3 flex gap-0.5 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] shadow-sm select-none z-10">
                          {msg.reactions.map(r => (
                            <span key={r.id} title={`Reacted: ${r.reaction_type}`}>
                              {r.reaction_type === 'like' && '👍'}
                              {r.reaction_type === 'love' && '❤️'}
                              {r.reaction_type === 'haha' && '😂'}
                              {r.reaction_type === 'wow' && '😮'}
                              {r.reaction_type === 'sad' && '😢'}
                              {r.reaction_type === 'fire' && '🔥'}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Hover action menu overlay */}
                      <div className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl shadow-lg z-20
                        ${isMe ? '-left-20' : '-right-20'}`}
                      >
                        <button
                          onClick={() => handlePinMessage(msg.id)}
                          className="p-1 rounded text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          title="Pin Message"
                        >
                          <Pin size={12} className="rotate-45" />
                        </button>
                        <div className="flex gap-0.5 border-l border-slate-200 dark:border-slate-700 pl-1">
                          {['like', 'love', 'haha', 'fire'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReactToMessage(msg.id, emoji)}
                              className="hover:scale-125 transition-transform"
                            >
                              {emoji === 'like' && '👍'}
                              {emoji === 'love' && '❤️'}
                              {emoji === 'haha' && '😂'}
                              {emoji === 'fire' && '🔥'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Read receipt / confirmation checkmarks */}
                    {isMe && (
                      <div className="flex justify-end pr-1.5">
                        {msg.is_read ? (
                          <CheckCheck size={12} className="text-emerald-500" title="Read" />
                        ) : (
                          <Check size={12} className="text-slate-400" title="Delivered" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicators */}
            {activeTypingUsers.length > 0 && (
              <div className="flex items-center gap-2 pl-12 text-slate-400 text-xs animate-pulse">
                <span className="font-semibold">{activeTypingUsers.join(', ')} typing</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Active input bar */}
          <div className="bg-white dark:bg-gray-950 border-t border-slate-200 dark:border-slate-800 p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAttachFile} 
                className="hidden" 
                accept="image/*,video/*"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current.click()}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                title="Attach Photo/Video"
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin text-indigo-500" />
                ) : (
                  <Paperclip size={18} />
                )}
              </button>

              <input
                type="text"
                placeholder="Type a message..."
                value={newMessageText}
                onChange={e => {
                  setNewMessageText(e.target.value);
                  handleTyping();
                }}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />

              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/15"
              >
                <Send size={16} />
              </button>
            </form>
            {uploadError && <p className="text-[10px] text-rose-500 mt-1 pl-1">{uploadError}</p>}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Select a chat thread or click New Chat to start.
        </div>
      )}

      {/* NEW DM CHAT MODAL */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-slate-850 max-w-md w-full p-6 shadow-xl relative animate-slide-up">
            <button 
              onClick={() => setShowNewChatModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650"
            >
              <X size={18} />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Start Direct Message</h2>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search other users by name or email..."
                value={usersSearch}
                onChange={e => {
                  setUsersSearch(e.target.value);
                  loadUsers(e.target.value);
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {usersList.map(u => (
                <div
                  key={u.id}
                  onClick={() => handleStartDM(u)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                >
                  <img
                    src={u.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-200">{u.name}</p>
                    <p className="text-[10px] text-slate-450 truncate">{u.email}</p>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${u.online_status ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-slate-850 max-w-md w-full p-6 shadow-xl relative animate-slide-up">
            <button 
              onClick={() => setShowGroupModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650"
            >
              <X size={18} />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Create Channel Chat</h2>
            
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Group Name</label>
                <input
                  type="text" required
                  placeholder="e.g. Batch A Study Group, Project Falcon"
                  value={groupName} onChange={e => setGroupName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Group Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'group', label: 'Standard' },
                    { id: 'batch', label: 'Batch' },
                    { id: 'project', label: 'Project' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGroupType(item.id)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all duration-150
                        ${groupType === item.id 
                          ? 'bg-indigo-650 border-indigo-600 text-white shadow shadow-indigo-600/10'
                          : 'border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-colors"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
