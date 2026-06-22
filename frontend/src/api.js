import axios from 'axios';

export const BASE_URL = 'http://127.0.0.1:8000/api';
export const WS_BASE_URL = 'ws://127.0.0.1:8000/api/ws';

// Create Axios Instance
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add JWT token
client.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('pulsemail_user') || 'null');
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for handling errors
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('pulsemail_user');
      window.location.reload();
    }
    const message = error.response?.data?.detail || error.message || 'Server error';
    return Promise.reject(new Error(message));
  }
);

export const api = {
  // Auth
  login: (data) => client.post('/login', data),
  register: (data) => client.post('/register', data),
  getCurrentUser: () => client.get('/users/me'),
  getUsers: (search = '') => client.get(`/users?search=${encodeURIComponent(search)}`),

  // Community Management
  getCommunities: () => client.get('/communities'),
  createCommunity: (name, description = '', imageUrl = '', communityType = 'public') => 
    client.post(`/communities?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&image_url=${encodeURIComponent(imageUrl)}&community_type=${communityType}`),
  editCommunity: (id, name, description = '', imageUrl = '') => 
    client.put(`/communities/${id}?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&image_url=${encodeURIComponent(imageUrl)}`),
  deleteCommunity: (id) => client.delete(`/communities/${id}`),
  joinCommunity: (id) => client.post(`/communities/${id}/join`),
  leaveCommunity: (id) => client.post(`/communities/${id}/leave`),
  getCommunityMembers: (id) => client.get(`/communities/${id}/members`),
  addCommunityMember: (communityId, userId) => client.post(`/communities/${communityId}/members/${userId}`),
  removeCommunityMember: (communityId, userId) => client.delete(`/communities/${communityId}/members/${userId}`),
  inviteCommunityMember: (communityId, userId) => client.post(`/communities/${communityId}/invite/${userId}`),
  getCommunityGroups: (communityId) => client.get(`/communities/${communityId}/groups`),
  createCommunityGroup: (communityId, name) => client.post(`/communities/${communityId}/groups?name=${encodeURIComponent(name)}`),

  // Community Feed
  getPosts: (communityId) => client.get(`/communities/${communityId}/posts`),
  createPost: (communityId, content, imageUrl = '', videoUrl = '') => {
    let url = `/communities/${communityId}/posts?content=${encodeURIComponent(content)}`;
    if (imageUrl) url += `&image_url=${encodeURIComponent(imageUrl)}`;
    if (videoUrl) url += `&video_url=${encodeURIComponent(videoUrl)}`;
    return client.post(url);
  },
  likePost: (postId) => client.post(`/posts/${postId}/like`),
  getComments: (postId) => client.get(`/posts/${postId}/comments`),
  commentOnPost: (postId, content, parentId = null) => {
    let url = `/posts/${postId}/comments?content=${encodeURIComponent(content)}`;
    if (parentId) url += `&parent_id=${parentId}`;
    return client.post(url);
  },

  // One-to-One and Group Chat
  getConversations: () => client.get('/conversations'),
  getOrCreateConversation: (type, otherUserId = null, name = '', communityId = null) => {
    let url = `/conversations?type=${type}`;
    if (otherUserId) url += `&other_user_id=${otherUserId}`;
    if (name) url += `&name=${encodeURIComponent(name)}`;
    if (communityId) url += `&community_id=${communityId}`;
    return client.post(url);
  },
  joinConversation: (conversationId) => client.post(`/conversations/${conversationId}/join`),
  getMessages: (conversationId) => client.get(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, content, messageType = 'text', fileUrl = '') => {
    let url = `/conversations/${conversationId}/messages?content=${encodeURIComponent(content)}&message_type=${messageType}`;
    if (fileUrl) url += `&file_url=${encodeURIComponent(fileUrl)}`;
    return client.post(url);
  },
  pinMessage: (messageId) => client.put(`/messages/${messageId}/pin`),
  reactToMessage: (messageId, reactionType) => client.post(`/messages/${messageId}/react?reaction_type=${encodeURIComponent(reactionType)}`),

  // Notifications
  getNotifications: () => client.get('/notifications'),
  markNotificationRead: (id) => client.put(`/notifications/${id}/read`),

  // Search
  search: (q) => client.get(`/search?q=${encodeURIComponent(q)}`),

  // Admin Batch Courses
  getAdminCourses: () => client.get('/admin/courses'),
  createAdminCourse: (name, description = '', batchCode = '', startDate = '', endDate = '') => {
    let url = `/admin/courses?name=${encodeURIComponent(name)}`;
    if (description) url += `&description=${encodeURIComponent(description)}`;
    if (batchCode) url += `&batch_code=${encodeURIComponent(batchCode)}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return client.post(url);
  },

  // Student: Browse & Enroll Courses
  getCourses: () => client.get('/courses'),
  enrollCourse: (courseId) => client.post(`/courses/${courseId}/enroll`),

  // File Upload
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${JSON.parse(localStorage.getItem('pulsemail_user') || 'null')?.token}`
      }
    }).then(res => res.data);
  }
};

export const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s), now = new Date(), diff = Math.floor((now - d) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};
