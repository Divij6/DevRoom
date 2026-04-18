import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearStoredToken,
  getMe,
  getStoredToken,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  setStoredToken,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Do not auto-login on app start. The app will show the login screen
  // and the user should explicitly sign in. This avoids unexpected
  // automatic redirects when a token is present in localStorage
  // (e.g. leftover test tokens).
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    const res = await apiLogin({ email, password });

    setStoredToken(res.data.token);
    setUser(res.data.user);

    return res.data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await apiRegister({ name, email, password });
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    clearStoredToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
