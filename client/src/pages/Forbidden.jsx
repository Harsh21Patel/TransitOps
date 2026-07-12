import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Maps each role to their correct first accessible page
const ROLE_HOME = {
  ADMIN:            '/admin/dashboard',
  FLEET_MANAGER:    '/fleet',
  DISPATCHER:       '/dispatcher/dashboard',
  SAFETY_OFFICER:   '/drivers',
  FINANCIAL_ANALYST:'/fuel',
};

const Forbidden = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const home = user?.role ? (ROLE_HOME[user.role] || '/dashboard') : '/login';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="bg-white rounded-lg border border-gray-200 p-10 max-w-sm w-full shadow-sm">
        <ShieldAlert className="text-red-400 mx-auto mb-4" size={40} />
        <h1 className="text-lg font-semibold text-gray-800 mb-2">Access Restricted</h1>
        <p className="text-sm text-gray-500 mb-1">
          Your role <strong className="text-gray-700">{user?.role?.replace(/_/g, ' ')}</strong> does not
          have permission to view this page.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Contact an administrator if you believe this is a mistake.
        </p>
        <button
          onClick={() => navigate(home, { replace: true })}
          className="w-full py-2 text-sm font-semibold text-white rounded transition hover:opacity-90"
          style={{ backgroundColor: '#f59e0b' }}
        >
          Go to my dashboard
        </button>
      </div>
    </div>
  );
};

export default Forbidden;
