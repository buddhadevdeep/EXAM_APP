import API_BASE from '../config/api.js';
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [loading, setLoading] = useState(true);
  const [cachedExams, setCachedExams] = useState(null);
  const [cachedSubmissions, setCachedSubmissions] = useState(null);
  const [cachedTeacherExams, setCachedTeacherExams] = useState(null);
  const [cachedAdminStats, setCachedAdminStats] = useState(null);

  // Setup default headersfi
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  useEffect(() => {
    const root = window.document.body;
    if (darkMode) {
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE}/api/auth/profile`);
        setUser({
          id: res.data.id,
          email: res.data.email,
          role: res.data.role,
          name: res.data.full_name || 'User',
          entityId: res.data.id // Student/Teacher table primary ID gets resolved mapping
        });
      } catch (err) {
        logout();
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
  }, [token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          const errMsg = error.response.data?.message || '';
          if (errMsg.includes('Session expired') || errMsg.includes('logged in from another device')) {
            alert('Your session has expired because you logged in from another device.');
            logout();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    if (!token || !user || user.role !== 'Student') return;

    // Send a heartbeat ping to keep last_active_at updated and prevent other logins
    const interval = setInterval(() => {
      axios.get(`${API_BASE}/api/student/notifications`).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [token, user]);


  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
    const { token: userToken, user: userData } = res.data;
    localStorage.setItem('token', userToken);
    setToken(userToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
    return userData;
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${API_BASE}/api/auth/logout`);
      }
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setCachedExams(null);
      setCachedSubmissions(null);
      setCachedTeacherExams(null);
      setCachedAdminStats(null);
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <AuthContext.Provider value={{
      user, token, loading, darkMode, login, logout, toggleTheme, setUser,
      cachedExams, setCachedExams,
      cachedSubmissions, setCachedSubmissions,
      cachedTeacherExams, setCachedTeacherExams,
      cachedAdminStats, setCachedAdminStats
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


