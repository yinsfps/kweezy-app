import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Configuration ---
// Add export keyword to make it importable
export const API_BASE_URL = 'http://192.168.0.101:3001/api';

// Helper function to get the JWT token
const getToken = async () => {
  try { return await AsyncStorage.getItem('userToken'); }
  catch (e) { console.error("Failed to fetch token", e); return null; }
};

// Helper function for making authenticated requests
const fetchWithAuth = async (url, options = {}) => {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) console.warn(`Auth error (${response.status})`);
    return response;
  } catch (error) { console.error(`Network error: ${error}`); throw error; }
};

// --- API Functions ---

// Auth
export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response;
};
export const registerUser = async (username, email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return response;
};
export const updateUserProfile = async (profileData) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT', body: JSON.stringify(profileData),
    });
    return response;
};

// Content
export const fetchNovels = async () => {
  const response = await fetch(`${API_BASE_URL}/content/novels`);
  if (!response.ok) throw new Error('Failed to fetch novels');
  return response.json();
};
// Modified to use fetchWithAuth - Fetches details AND user progress if logged in
export const fetchNovelDetails = async (novelId) => {
  const response = await fetchWithAuth(`${API_BASE_URL}/content/novels/${novelId}`);
  if (!response.ok) throw new Error('Failed to fetch novel details');
  return response.json();
};
export const fetchChapterSegments = async (chapterId) => {
  const response = await fetch(`${API_BASE_URL}/content/chapters/${chapterId}/segments`);
  if (!response.ok) throw new Error('Failed to fetch chapter segments');
  return response.json();
};

// Interactions (Comments & Reactions)
export const fetchCommentsForSegment = async (segmentId, page = 1, limit = 10) => {
  const response = await fetchWithAuth(`${API_BASE_URL}/interactions/segments/${segmentId}/comments?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
};
export const postComment = async (segmentId, commentText, parentCommentId = null) => {
  const body = { commentText, parentCommentId };
  const response = await fetchWithAuth(`${API_BASE_URL}/interactions/segments/${segmentId}/comments`, {
    method: 'POST', body: JSON.stringify(body),
  });
  return response;
};
export const toggleCommentLike = async (commentId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/interactions/comments/${commentId}/like`, { method: 'POST' });
    return response;
};
export const fetchReactionsForSegment = async (segmentId) => {
    const response = await fetch(`${API_BASE_URL}/interactions/segments/${segmentId}/reactions`);
    if (!response.ok) throw new Error('Failed to fetch reactions');
    return response.json();
};
export const toggleReaction = async (segmentId, reactionType) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/interactions/segments/${segmentId}/reactions`, {
        method: 'POST', body: JSON.stringify({ reactionType }),
    });
    return response;
};

// Blog
export const fetchBlogPosts = async (page = 1, limit = 5) => {
  const response = await fetch(`${API_BASE_URL}/blog?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch blog posts');
  return response.json();
};
export const fetchBlogPost = async (postId) => {
  const response = await fetch(`${API_BASE_URL}/blog/${postId}`);
  if (!response.ok) throw new Error('Failed to fetch blog post');
  return response.json();
};

// Progress Tracking
// Renamed existing function to avoid confusion
export const fetchUserNovelProgress = async (novelId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/progress/novel/${novelId}`);
    if (!response.ok) {
        if (response.status === 404) return null; // No progress found is okay
        throw new Error('Failed to fetch user progress');
    }
    return response.json();
};
export const updateUserNovelProgress = async (novelId, chapterId, scrollY) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/progress/novel/${novelId}`, {
        method: 'PUT',
        body: JSON.stringify({ lastReadChapterId: chapterId, lastReadScrollY: scrollY }),
    });
    if (!response.ok) throw new Error('Failed to update user progress');
    return response.json();
};
