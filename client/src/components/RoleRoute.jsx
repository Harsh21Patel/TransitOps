import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingPage } from './ui';

const RoleRoute = ({ allowedRoles, children }) => {
  const { user, bootstrapped, isAuthenticated } = useAuth();

  if (!bootstrapped) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <LoadingPage />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};

export default RoleRoute;
