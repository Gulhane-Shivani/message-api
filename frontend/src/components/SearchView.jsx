import { useState } from 'react';
import { api, fmtDate } from '../api.js';
import { Search, User, Users, MessageSquare, Compass, ArrowRight, Loader2 } from 'lucide-react';

export default function SearchView({ onStartChat, onViewCommunity }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'users' | 'communities' | 'messages'

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api.search(query.trim());
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = results && (
    results.users.length > 0 || 
    results.communities.length > 0 || 
    results.messages.length > 0
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-gray-900 p-6">
      {/* Header Search bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <h1 className="text-xl font-bold text-slate-905 dark:text-white mb-4">Global Search Database</h1>
        <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search user names, community feeds, text messages..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-950 border border-slate-250 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-650 text-white text-xs font-bold hover:bg-indigo-705 disabled:opacity-50 transition-all flex items-center gap-2 shadow shadow-indigo-600/10"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* Tabs */}
      {results && (
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
          {[
            { id: 'all', label: 'All Results' },
            { id: 'users', label: `Users (${results.users.length})` },
            { id: 'communities', label: `Communities (${results.communities.length})` },
            { id: 'messages', label: `Messages (${results.messages.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-xs font-bold transition-all px-2 border-b-2
                ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Results Container */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : !results ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center">
            <Search size={40} className="mb-2 opacity-50" />
            <p className="text-xs">Type a search term and press Search</p>
          </div>
        ) : !hasResults ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
            <p className="text-xs">No records found matching "{query}"</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {/* 1. Users list */}
            {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
              <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User size={14} />
                  <span>Users Found</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.users.map(u => (
                    <div key={u.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/10">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{u.name}</p>
                          <p className="text-[10px] text-slate-450 truncate">{u.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onStartChat(u)}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-650 hover:underline"
                      >
                        <span>Chat</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Communities list */}
            {(activeTab === 'all' || activeTab === 'communities') && results.communities.length > 0 && (
              <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users size={14} />
                  <span>Communities Found</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.communities.map(c => (
                    <div key={c.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/10">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={c.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{c.name}</p>
                          <p className="text-[10px] text-slate-450 truncate mt-0.5">{c.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onViewCommunity(c)}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-650 hover:underline flex-shrink-0"
                      >
                        <span>View</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Messages List */}
            {(activeTab === 'all' || activeTab === 'messages') && results.messages.length > 0 && (
              <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  <span>Chat Messages Found</span>
                </h3>
                <div className="space-y-3">
                  {results.messages.map(m => (
                    <div key={m.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/10 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400">Match in Chat</span>
                          <span className="text-[9px] text-slate-400">{fmtDate(m.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-350 mt-1 italic font-medium">"{m.content}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
