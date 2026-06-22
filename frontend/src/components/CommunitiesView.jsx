import { useState, useEffect, useRef } from 'react';
import { api, fmtDate } from '../api.js';
import { 
  Plus, Search, Image, Video, ThumbsUp, MessageSquare, CornerDownRight, 
  Settings, Trash2, Edit, X, Globe, Shield, User, LogOut, CheckCircle, AlertCircle
} from 'lucide-react';

export default function CommunitiesView({ currentUser, initialCommunity, clearInitialCommunity, onSelectConversation }) {
  const [communities, setCommunities] = useState([]);
  const [activeComm, setActiveComm] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  
  // Group / Channels inside Community
  const [groups, setGroups] = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  // Modals / Dialogs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cImage, setCImage] = useState('');
  const [cType, setCType] = useState('public'); // 'public' | 'private' | 'restricted'
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editImage, setEditImage] = useState('');
  // Member management
  const [allUsers, setAllUsers] = useState([]);
  const [memberActionMsg, setMemberActionMsg] = useState('');

  // Feed Inputs
  const [postContent, setPostContent] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('image'); // 'image' | 'video'
  const fileInputRef = useRef(null);

  // Comment Inputs
  const [activeCommentPost, setActiveCommentPost] = useState(null); // post ID
  const [comments, setComments] = useState({}); // postId -> comment list
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null); // comment ID
  const [replyText, setReplyText] = useState('');

  // Feedback messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCommunities();
  }, []);

  useEffect(() => {
    if (initialCommunity) {
      handleSelectCommunity(initialCommunity);
      clearInitialCommunity();
    }
  }, [initialCommunity]);

  const loadCommunities = async () => {
    try {
      const data = await api.getCommunities();
      setCommunities(data);
      if (data.length > 0 && !activeComm) {
        handleSelectCommunity(data[0]);
      } else if (activeComm) {
        // Refresh active community object
        const updated = data.find(c => c.id === activeComm.id);
        if (updated) setActiveComm(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectCommunity = async (comm) => {
    setActiveComm(comm);
    setPosts([]);
    setMembers([]);
    setGroups([]);
    setActiveCommentPost(null);
    try {
      const [postData, memberData, groupData] = await Promise.all([
        api.getPosts(comm.id),
        api.getCommunityMembers(comm.id),
        api.getCommunityGroups(comm.id)
      ]);
      setPosts(postData);
      setMembers(memberData);
      setGroups(groupData);
    } catch (e) {
      console.error(e);
    }
  };

  // --- File Upload ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await api.uploadFile(file);
      setPreviewUrl(res.url);
      setPreviewType(res.type);
      setUploadFile(file);
    } catch (err) {
      setError('File upload failed. Try another file.');
    } finally {
      setUploading(false);
    }
  };

  // --- Create Post ---
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && !previewUrl) return;
    setError('');
    try {
      const imageParam = previewType === 'image' ? previewUrl : null;
      const videoParam = previewType === 'video' ? previewUrl : null;
      await api.createPost(activeComm.id, postContent.trim(), imageParam, videoParam);
      setPostContent('');
      setPreviewUrl('');
      setUploadFile(null);
      
      // Reload posts
      const updatedPosts = await api.getPosts(activeComm.id);
      setPosts(updatedPosts);
    } catch (err) {
      setError(err.message);
    }
  };

  // --- Post Like ---
  const handleLikePost = async (postId) => {
    try {
      const data = await api.likePost(postId);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, is_liked: data.is_liked, like_count: data.like_count };
        }
        return p;
      }));
    } catch (e) {
      console.error(e);
    }
  };

  // --- Comments ---
  const handleOpenComments = async (postId) => {
    if (activeCommentPost === postId) {
      setActiveCommentPost(null);
      return;
    }
    setActiveCommentPost(postId);
    setReplyTarget(null);
    try {
      const data = await api.getComments(postId);
      setComments(prev => ({ ...prev, [postId]: data }));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostComment = async (postId) => {
    if (!commentText.trim()) return;
    try {
      await api.commentOnPost(postId, commentText.trim());
      setCommentText('');
      // Reload comments
      const data = await api.getComments(postId);
      setComments(prev => ({ ...prev, [postId]: data }));
      
      // Update comment count in posts list
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostReply = async (postId, parentId) => {
    if (!replyText.trim()) return;
    try {
      await api.commentOnPost(postId, replyText.trim(), parentId);
      setReplyText('');
      setReplyTarget(null);
      // Reload comments
      const data = await api.getComments(postId);
      setComments(prev => ({ ...prev, [postId]: data }));
      
      // Update comment count
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
    } catch (e) {
      console.error(e);
    }
  };

  // --- Join / Leave Community ---
  const handleJoinLeave = async (comm) => {
    try {
      if (comm.is_member) {
        if (comm.creator_id === currentUser.id) {
          alert("Creators cannot leave their own community. You can delete it instead.");
          return;
        }
        await api.leaveCommunity(comm.id);
      } else {
        await api.joinCommunity(comm.id);
      }
      loadCommunities();
      setTimeout(() => {
        if (activeComm && activeComm.id === comm.id) {
          handleSelectCommunity(comm);
        }
      }, 300);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Community Management API Calls ---
  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    setError('');
    if (!cName.trim()) return;
    try {
      await api.createCommunity(cName.trim(), cDesc.trim(), cImage.trim(), cType);
      setCName(''); setCDesc(''); setCImage(''); setCType('public');
      setShowCreateModal(false);
      setSuccess('Community created successfully!');
      loadCommunities();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenEditModal = () => {
    setEditName(activeComm.name);
    setEditDesc(activeComm.description);
    setEditImage(activeComm.image_url);
    setShowEditModal(true);
  };

  const handleEditCommunity = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.editCommunity(activeComm.id, editName.trim(), editDesc.trim(), editImage.trim());
      setShowEditModal(false);
      setSuccess('Community updated successfully!');
      loadCommunities();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete this community?")) return;
    try {
      await api.deleteCommunity(activeComm.id);
      setActiveComm(null); setPosts([]); setMembers([]);
      setSuccess('Community deleted.'); loadCommunities();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
  };

  const handleOpenMembersModal = async () => {
    try {
      const data = await api.getUsers('');
      setAllUsers(data);
      setShowMembersModal(true);
    } catch (e) { console.error(e); }
  };

  const handleAddMember = async (userId) => {
    try {
      const res = await api.addCommunityMember(activeComm.id, userId);
      setMemberActionMsg(res.message);
      const updated = await api.getCommunityMembers(activeComm.id);
      setMembers(updated);
      setTimeout(() => setMemberActionMsg(''), 3000);
    } catch (e) { setMemberActionMsg(e.message); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const res = await api.removeCommunityMember(activeComm.id, userId);
      setMemberActionMsg(res.message);
      const updated = await api.getCommunityMembers(activeComm.id);
      setMembers(updated);
      setTimeout(() => setMemberActionMsg(''), 3000);
    } catch (e) { setMemberActionMsg(e.message); }
  };

  const handleInviteMember = async (userId) => {
    try {
      const res = await api.inviteCommunityMember(activeComm.id, userId);
      setMemberActionMsg(res.message);
      setTimeout(() => setMemberActionMsg(''), 3000);
    } catch (e) { setMemberActionMsg(e.message); }
  };

  const handleSelectGroup = async (group) => {
    try {
      const convs = await api.getConversations();
      const matched = convs.find(c => c.id === group.id);
      if (matched) {
        onSelectConversation(matched);
      } else {
        onSelectConversation({
          id: group.id,
          name: group.name,
          type: 'group',
          community_id: activeComm.id
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinGroup = async (group) => {
    try {
      await api.joinConversation(group.id);
      const updatedGroups = await api.getCommunityGroups(activeComm.id);
      setGroups(updatedGroups);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to join group');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setError('');
    try {
      await api.createCommunityGroup(activeComm.id, newGroupName.trim());
      setNewGroupName('');
      setShowCreateGroupModal(false);
      const updatedGroups = await api.getCommunityGroups(activeComm.id);
      setGroups(updatedGroups);
    } catch (err) {
      setError(err.message || 'Failed to create group');
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-gray-900">
      {/* 1. Left Column: Community Discovery */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-950 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Communities</h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
            title="Create Community"
          >
            <Plus size={18} />
          </button>
        </div>

        {success && (
          <div className="m-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle size={14} /> <span>{success}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {communities.map(comm => (
            <div 
              key={comm.id}
              onClick={() => handleSelectCommunity(comm)}
              className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 border transition-all duration-150
                ${activeComm?.id === comm.id 
                  ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' 
                  : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
            >
              <img 
                src={comm.image_url} 
                alt={comm.name} 
                className="w-11 h-11 rounded-lg object-cover bg-slate-100"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{comm.name}</h4>
                  <div className="flex gap-1 flex-shrink-0">
                    {comm.creator_id === currentUser.id && (
                      <span className="text-[9px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">Admin</span>
                    )}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      comm.community_type === 'private' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' :
                      comm.community_type === 'restricted' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' :
                      'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    }`}>{comm.community_type || 'public'}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{comm.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">{comm.member_count} members</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinLeave(comm);
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors
                      ${comm.is_member 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                  >
                    {comm.is_member ? 'Leave' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Middle Column: Community Feed */}
      {activeComm ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/50">
          {/* Cover Header */}
          <div className="bg-white dark:bg-gray-950 border-b border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={activeComm.image_url} 
                alt={activeComm.name} 
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
              />
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  {activeComm.name}
                </h1>
                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xl truncate">{activeComm.description}</p>
              </div>
            </div>
            {activeComm.creator_id === currentUser.id && (
              <div className="flex gap-2">
                <button
                  onClick={handleOpenEditModal}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors"
                  title="Edit Community"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={handleDeleteCommunity}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 text-slate-600 dark:text-slate-400 transition-colors"
                  title="Delete Community"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Create Post Card */}
            {activeComm.is_member ? (
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <div className="flex gap-3">
                    <img 
                      src={currentUser.avatar_url} 
                      alt="" 
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <textarea
                      placeholder={`Share something in ${activeComm.name}...`}
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                      className="flex-1 resize-none bg-transparent border-0 focus:ring-0 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none py-1"
                      rows={2}
                    />
                  </div>

                  {previewUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-60 bg-slate-900">
                      <button
                        type="button"
                        onClick={() => setPreviewUrl('')}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors z-10"
                      >
                        <X size={15} />
                      </button>
                      {previewType === 'image' ? (
                        <img src={previewUrl} alt="Preview" className="max-h-60 w-full object-contain" />
                      ) : (
                        <video src={previewUrl} controls className="max-h-60 w-full object-contain" />
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
                      <AlertCircle size={14} /> <span>{error}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*,video/*"
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => {
                          setPreviewType('image');
                          fileInputRef.current.click();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                      >
                        <Image size={15} className="text-emerald-500" />
                        <span>{uploading ? 'Uploading...' : 'Photo'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => {
                          setPreviewType('video');
                          fileInputRef.current.click();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                      >
                        <Video size={15} className="text-rose-500" />
                        <span>Video</span>
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!postContent.trim() && !previewUrl}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/10"
                    >
                      Post
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Shield className="mx-auto text-indigo-500 mb-3" size={36} />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Join Community to view and post</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">This community's posts are only visible to joined community members.</p>
                <button
                  onClick={() => handleJoinLeave(activeComm)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all"
                >
                  Join Community
                </button>
              </div>
            )}

            {/* Posts Feed list */}
            {activeComm.is_member && posts.map(post => (
              <div key={post.id} className="bg-white dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                {/* Author row */}
                <div className="flex items-center gap-3">
                  <img 
                    src={post.author?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                    alt={post.author?.name} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{post.author?.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(post.created_at)}</p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                {/* Media */}
                {post.image_url && post.image_url !== 'null' && post.image_url !== 'undefined' && (
                  <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-96 bg-slate-900">
                    <img src={post.image_url} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                {post.video_url && post.video_url !== 'null' && post.video_url !== 'undefined' && (
                  <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-96 bg-slate-900">
                    <video src={post.video_url} controls className="w-full h-full object-contain" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-500 dark:text-slate-400">
                  <button 
                    onClick={() => handleLikePost(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold hover:text-indigo-600 transition-colors
                      ${post.is_liked ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    <ThumbsUp size={15} />
                    <span>{post.like_count}</span>
                  </button>
                  <button 
                    onClick={() => handleOpenComments(post.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold hover:text-indigo-600 transition-colors"
                  >
                    <MessageSquare size={15} />
                    <span>{post.comment_count}</span>
                  </button>
                </div>

                {/* Nested Comments Drawer */}
                {activeCommentPost === post.id && (
                  <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-4">
                    {/* Add Comment Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                      />
                      <button
                        onClick={() => handlePostComment(post.id)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Send
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4">
                      {comments[post.id]?.map(comment => (
                        <div key={comment.id} className="space-y-2.5">
                          <div className="flex gap-2.5">
                            <img 
                              src={comment.author?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                              alt="" 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{comment.author?.name}</h5>
                                <span className="text-[9px] text-slate-400">{fmtDate(comment.created_at)}</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{comment.content}</p>
                              
                              {/* Reply trigger button */}
                              <div className="mt-2 flex items-center justify-between">
                                <button
                                  onClick={() => setReplyTarget(replyTarget === comment.id ? null : comment.id)}
                                  className="text-[10px] text-indigo-500 hover:underline font-bold"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Reply Input Form */}
                          {replyTarget === comment.id && (
                            <div className="pl-10 flex gap-2">
                              <input
                                type="text"
                                placeholder={`Reply to ${comment.author?.name}...`}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                              />
                              <button
                                onClick={() => handlePostReply(post.id, comment.id)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                              >
                                Reply
                              </button>
                            </div>
                          )}

                          {/* Replies Render */}
                          {comment.replies?.map(reply => (
                            <div key={reply.id} className="pl-10 flex gap-2">
                              <CornerDownRight size={14} className="text-slate-300 mt-1 flex-shrink-0" />
                              <div className="flex gap-2">
                                <img 
                                  src={reply.author?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                                  alt="" 
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                                <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5">
                                  <div className="flex items-center justify-between">
                                    <h6 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{reply.author?.name}</h6>
                                    <span className="text-[9px] text-slate-400">{fmtDate(reply.created_at)}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{reply.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Select or Create a Community to begin.
        </div>
      )}

      {/* 3. Right Column: Community Info / Members */}
      {activeComm && activeComm.is_member && (
        <div className="w-64 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-950 p-4 flex flex-col overflow-y-auto">
          {/* GROUPS / CHANNELS SECTION */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Groups</h3>
              {activeComm.role === 'admin' && (
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  title="Add Group"
                  className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            
            <div className="space-y-1">
              {groups.map(g => (
                <div 
                  key={g.id}
                  onClick={() => g.is_member && handleSelectGroup(g)}
                  className={`p-2 rounded-lg flex items-center justify-between border border-transparent transition-all
                    ${g.is_member 
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer hover:border-slate-100 dark:hover:border-slate-800' 
                      : 'bg-slate-50/30 dark:bg-slate-900/10 opacity-80'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 font-medium">#</span>
                    <span className={`text-xs font-bold truncate ${g.is_member ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                      {g.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {g.name.toLowerCase().includes('announcement') && (
                      <span className="text-[9px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">📢</span>
                    )}
                    {!g.is_member && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinGroup(g);
                        }}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition-all shadow shadow-indigo-600/10"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800 mb-4" />

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Members</h3>
            {activeComm.role === 'admin' && (
              <button
                onClick={handleOpenMembersModal}
                title="Add / Invite Members"
                className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          {memberActionMsg && (
            <div className="mb-3 p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] rounded-lg">{memberActionMsg}</div>
          )}
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={member.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                    alt={member.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">{member.name}</p>
                    <p className="text-[9px] text-slate-400">{member.role === 'admin' ? '👑 Admin' : 'Member'}</p>
                  </div>
                </div>
                {activeComm.role === 'admin' && member.id !== currentUser.id && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    title="Remove member"
                    className="p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-slate-850 max-w-md w-full p-6 shadow-xl relative animate-slide-up">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create Community</h2>
            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Community Name</label>
                <input
                  type="text" required
                  placeholder="e.g. JavaScript Wizards"
                  value={cName} onChange={e => setCName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  placeholder="Tell people what this community is about..."
                  value={cDesc} onChange={e => setCDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cover Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={cImage} onChange={e => setCImage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Community Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{id:'public',label:'🌐 Public',desc:'Anyone can join'},{id:'restricted',label:'🔒 Restricted',desc:'Join by request'},{id:'private',label:'🔐 Private',desc:'Invite only'}].map(t => (
                    <button key={t.id} type="button" onClick={() => setCType(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        cType === t.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} /> <span>{error}</span>
                </div>
              )}
              <button 
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-colors"
              >
                Create Community
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-slate-850 max-w-md w-full p-6 shadow-xl relative animate-slide-up">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Edit Community</h2>
            <form onSubmit={handleEditCommunity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Community Name</label>
                <input
                  type="text" required
                  placeholder="Community Name"
                  value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  placeholder="Description..."
                  value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cover Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={editImage} onChange={e => setEditImage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              {error && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} /> <span>{error}</span>
                </div>
              )}
              <button 
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-colors"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD/INVITE MEMBERS MODAL */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-slate-850 max-w-md w-full p-6 shadow-xl relative animate-slide-up">
            <button onClick={() => setShowMembersModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Manage Members</h2>
            <p className="text-xs text-slate-400 mb-4">Add or invite users to <span className="font-bold text-indigo-500">{activeComm?.name}</span></p>
            {memberActionMsg && (
              <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-xs rounded-xl">{memberActionMsg}</div>
            )}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {allUsers.filter(u => !members.some(m => m.id === u.id)).map(u => (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900">
                  <div className="flex items-center gap-2.5">
                    <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAddMember(u.id)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition-colors">
                      Add
                    </button>
                    <button onClick={() => handleInviteMember(u.id)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      Invite
                    </button>
                  </div>
                </div>
              ))}
              {allUsers.filter(u => !members.some(m => m.id === u.id)).length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">All users are already members.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-slate-850 max-w-sm w-full p-6 shadow-xl relative animate-slide-up">
            <button 
              onClick={() => {
                setShowCreateGroupModal(false);
                setError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Group Name</label>
                <input
                  type="text" required
                  placeholder="e.g. general, announcements"
                  value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              {error && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} /> <span>{error}</span>
                </div>
              )}
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
