import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Truck, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const Login = () => {
  const { login, isAuthenticated, bootstrapped } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  if (bootstrapped && isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  }

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await login(values);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #2563eb 0%, transparent 40%), radial-gradient(circle at 80% 80%, #1d4ed8 0%, transparent 45%)',
          }}
        />
        <div className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <Truck size={20} />
          </div>
          <span className="text-lg font-semibold tracking-tight">TransitOps</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Run your entire fleet from one command center.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Vehicles, drivers, trips, maintenance, and costs — synced in real time so
            dispatch decisions never wait on a spreadsheet.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-6 text-sm text-slate-300">
          <div>
            <div className="text-2xl font-semibold text-white">50+</div>
            <div className="mt-1 text-xs text-slate-400">Vehicles tracked</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-white">30+</div>
            <div className="mt-1 text-xs text-slate-400">Active drivers</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-white">24/7</div>
            <div className="mt-1 text-xs text-slate-400">Live dispatch</div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-50 p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Truck size={20} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">TransitOps</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your credentials to access the operations dashboard.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@transitops.com"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-brand-500/30 ${
                  errors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-brand-500'
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <a href="#" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-brand-500/30 ${
                    errors.password ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-brand-500'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                {...register('rememberMe')}
              />
              Remember me for 30 days
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Access is provisioned by your fleet administrator. Contact them if you need an account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
