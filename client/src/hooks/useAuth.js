import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return {
    user: context.user,
    accessToken: context.token,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    bootstrapped: !context.isLoading,
    login: context.login,
    logout: context.logout,
    hasRole: context.hasRole,
  };
};
