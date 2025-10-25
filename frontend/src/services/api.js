import axios from 'axios';

// Create an instance of axios
const api = axios.create({
  baseURL: 'https://lovebirds-mwyz.onrender.com/api', // Your backend server URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// You can also add interceptors here to handle auth tokens
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
