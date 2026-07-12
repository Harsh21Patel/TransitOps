import { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import api from '../services/api';

export const AuthContext = createContext(null);

const ROLE_MAP = {
  'Admin': 'ADMIN',
  'Fleet Manager': 'FLEET_MANAGER',
  'Dispatcher': 'DISPATCHER',
  'Safety Officer': 'SAFETY_OFFICER',
  'Financial Analyst': 'FINANCIAL_ANALYST',
  'ADMIN': 'ADMIN',
  'FLEET_MANAGER': 'FLEET_MANAGER',
  'DISPATCHER': 'DISPATCHER',
  'SAFETY_OFFICER': 'SAFETY_OFFICER',
  'FINANCIAL_ANALYST': 'FINANCIAL_ANALYST'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Recover session on load if token exists
  useEffect(() => {
    const bootstrap = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          // If we have a token, fetch the current logged-in user profile
          const profile = await authService.fetchMe();
          if (profile) {
            const mappedRole = ROLE_MAP[profile.role] || profile.role;
            setUser({ ...profile, role: mappedRole });
          } else {
            // If failed to fetch profile, clean up
            localStorage.removeItem('token');
            setUser(null);
            setToken(null);
          }
        } catch (err) {
          localStorage.removeItem('token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    bootstrap();
  }, []);

  const login = useCallback(async (email, password, rememberMe = true) => {
    setLoading(true);
    try {
      const data = await authService.login({ email, password, rememberMe });
      const accessToken = data.accessToken;
      const profile = data.user;
      
      const mappedRole = ROLE_MAP[profile.role] || profile.role;
      const mappedUser = { ...profile, role: mappedRole };

      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser(mappedUser);
      setLoading(false);
      return mappedUser;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const hasRole = useCallback((...allowedRoles) => {
    return Boolean(user) && allowedRoles.includes(user.role);
  }, [user]);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading: loading,
    login,
    logout,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
