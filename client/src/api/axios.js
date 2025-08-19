import axios from "axios";

// In dev with the proxy above, leave baseURL empty so requests go to /api -> proxied to 5000
// In prod, set VITE_API_URL to your deployed backend URL.
const api = axios.create({
  baseURL: import.meta.env.PROD ? import.meta.env.VITE_API_URL : "",
  withCredentials: true, // if you use cookies
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
