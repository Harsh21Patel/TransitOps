import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import TransitOpsLogo from '../components/TransitOpsLogo';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

const redirectUserByRole = (role, navigate) => {
  switch (role) {
    case 'ADMIN':
      navigate('/admin/dashboard', { replace: true });
      break;
    case 'FLEET_MANAGER':
      // Fleet Manager's domain: Fleet & Maintenance
      navigate('/fleet', { replace: true });
      break;
    case 'DISPATCHER':
      // Dispatcher's domain: Dashboard & Trips
      navigate('/dispatcher/dashboard', { replace: true });
      break;
    case 'SAFETY_OFFICER':
      // Safety Officer's domain: Drivers
      navigate('/drivers', { replace: true });
      break;
    case 'FINANCIAL_ANALYST':
      // Financial Analyst's domain: Fuel & Expenses, Analytics
      navigate('/fuel', { replace: true });
      break;
    default:
      navigate('/login', { replace: true });
  }
};

const Login = () => {
  const { login, isAuthenticated, bootstrapped, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (bootstrapped && isAuthenticated && user) {
      redirectUserByRole(user.role, navigate);
    }
  }, [bootstrapped, isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', role: 'Dispatcher', rememberMe: false },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    setAuthError('');
    try {
      const loggedUser = await login(values.email, values.password, values.rememberMe);
      redirectUserByRole(loggedUser.role, navigate);
    } catch (err) {
      const newCount = failedAttempts + 1;
      setFailedAttempts(newCount);
      setAuthError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* LEFT PANEL — dark brand */}
      <div className="hidden lg:flex flex-col justify-between bg-gray-900 text-white p-10" style={{ width: '380px', minWidth: '380px' }}>
        {/* Logo */}
        <div>
          <TransitOpsLogo size={40} variant="full" theme="dark" />
          <p className="text-sm text-gray-400 mt-2">Smart Transport Operations Platform</p>
        </div>

        {/* Roles list */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">One login, four roles:</p>
          <ul className="space-y-2">
            {['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'].map((role) => (
              <li key={role} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                {role}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest">TRANSITOPS © 2026 · RBAC ENG.</p>
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          {/* Logo — visible on mobile where left panel is hidden */}
          <div className="flex justify-center mb-5 lg:hidden">
            <TransitOpsLogo size={36} variant="full" theme="light" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-1">Sign in to your account</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Enter your credentials to continue</p>

          {/* Error state */}
          {authError && (
            <div className="mb-4 border-2 border-red-300 border-dashed rounded p-3 bg-red-50">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-700">Error state</p>
                  <p className="text-xs text-red-600 mt-0.5">{authError}</p>
                  {failedAttempts >= 3 && (
                    <p className="text-xs text-red-600">
                      Account locked after {failedAttempts} failed attempts.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* EMAIL */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="Raven@transitops.in"
                className={`w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 ${
                  errors.email ? 'border-red-400' : 'border-gray-300'
                }`}
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Passwor
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 pr-9 ${
                    errors.password ? 'border-red-400' : 'border-gray-300'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* ROLE (RBAC) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Role (RBAC)
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 appearance-none cursor-pointer"
                {...register('role')}
              >
                <option>Fleet Manager</option>
                <option>Dispatcher</option>
                <option>Safety Officer</option>
                <option>Financial Analyst</option>
                <option>Admin</option>
              </select>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                  {...register('rememberMe')}
                />
                Remember me
              </label>
              <button type="button" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </button>
            </div>

            {/* Sign In button */}
            <button
              type="submit"
              disabled={submitting || failedAttempts >= 5}
              className="w-full py-2.5 text-sm font-semibold text-white rounded transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: '#f59e0b' }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Role access info */}
          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600">Access is scoped by role after login:</p>
            <p>• Fleet Manager → Fleet, Maintenance</p>
            <p>• Dispatcher → Dashboard, Trips</p>
            <p>• Safety Officer → Drivers, Compliance</p>
            <p>• Financial Analyst → Fuel &amp; Expenses, Analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
