import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingPage } from './ui';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, bootstrapped } = useAuth();

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

  return children ? children : <Outlet />;
};

export default PrivateRoute;
