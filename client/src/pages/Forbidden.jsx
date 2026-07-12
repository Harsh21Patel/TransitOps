import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Forbidden = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
    <ShieldAlert className="text-slate-400" size={40} />
    <h1 className="text-xl font-semibold text-slate-900">Access restricted</h1>
    <p className="max-w-sm text-sm text-slate-500">
      Your role doesn't have permission to view this page. Contact an administrator if you
      believe this is a mistake.
    </p>
    <Link
      to="/dashboard"
      className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
    >
      Back to dashboard
    </Link>
  </div>
);

export default Forbidden;
