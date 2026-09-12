import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clf_user') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('clf_token') || null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('clf_token')));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    authService
      .getMe()
      .then((data) => active && setUser(data.user))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('clf_token', data.token);
    localStorage.setItem('clf_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async ({ username, email, password }) => {
    const data = await authService.register({ username, email, password });
    localStorage.setItem('clf_token', data.token);
    localStorage.setItem('clf_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const googleLogin = async (credential) => {
    const data = await authService.googleLogin(credential);
    localStorage.setItem('clf_token', data.token);
    localStorage.setItem('clf_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const updateUser = (next) => {
    localStorage.setItem('clf_user', JSON.stringify(next));
    setUser(next);
    return next;
  };

  const logout = () => {
    localStorage.removeItem('clf_token');
    localStorage.removeItem('clf_user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, googleLogin, logout, updateUser }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);