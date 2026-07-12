import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { loginUser, logoutUser } from '../features/auth/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, accessToken, status, error, bootstrapped } = useSelector((s) => s.auth);

  const login = useCallback(
    (credentials) => dispatch(loginUser(credentials)).unwrap(),
    [dispatch]
  );

  const logout = useCallback(() => dispatch(logoutUser()), [dispatch]);

  const hasRole = useCallback(
    (...roles) => Boolean(user) && roles.includes(user.role),
    [user]
  );

  return {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isLoading: status === 'loading',
    bootstrapped,
    error,
    login,
    logout,
    hasRole,
  };
};
