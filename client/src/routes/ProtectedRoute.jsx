import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Guards a route subtree. Renders nothing (a full-screen loader) until the
 * silent session bootstrap finishes, then redirects to /login if there's no
 * authenticated user, and to /403 if `allowedRoles` is set and the user's
 * role isn't in it.
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, bootstrapped, user } = useAuth();
  const location = useLocation();

  if (!bootstrapped) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
