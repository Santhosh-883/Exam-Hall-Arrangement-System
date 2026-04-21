import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

// If a token already exists in localStorage (after login), set it on the instance
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('adminToken');
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default api;
