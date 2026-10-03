import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fp_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('fp_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('fp_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('fp_token');
        localStorage.removeItem('fp_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('fp_token', data.token);
    localStorage.setItem('fp_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const registerCustomer = async (formData) => {
    const { data } = await api.post('/auth/register-customer', formData);
    localStorage.setItem('fp_token', data.token);
    localStorage.setItem('fp_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('fp_user', JSON.stringify(merged));
      return merged;
    });
  };

  const logout = () => {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, registerCustomer, updateUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
