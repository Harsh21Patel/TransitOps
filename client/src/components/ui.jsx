import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  // Vehicle / Driver statuses
  Available:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Trip':  'bg-blue-50 text-blue-700 border-blue-200',
  'In Shop':  'bg-amber-50 text-amber-700 border-amber-200',
  Retired:    'bg-slate-100 text-slate-500 border-slate-200',
  'Off Duty': 'bg-slate-100 text-slate-500 border-slate-200',
  Suspended:  'bg-rose-50 text-rose-700 border-rose-200',
  // Trip statuses
  Draft:      'bg-slate-100 text-slate-600 border-slate-200',
  Dispatched: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled:  'bg-rose-50 text-rose-700 border-rose-200',
  // Maintenance statuses
  Active:     'bg-amber-50 text-amber-700 border-amber-200',
};

export const StatusBadge = ({ status, size = 'sm' }) => {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-500 border-slate-200';
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';
  return (
    <span className={`inline-block font-semibold rounded-md border ${pad} ${cls}`}>
      {status}
    </span>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, subtitle, children, size = 'md' }) => {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className={`relative bg-white rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}
          >
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true, loading = false }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <div className="flex gap-3 mb-5">
      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${danger ? 'bg-rose-100' : 'bg-amber-100'}`}>
        <AlertTriangle size={18} className={danger ? 'text-rose-600' : 'text-amber-600'} />
      </div>
      <p className="text-sm text-slate-600 leading-relaxed pt-1.5">{message}</p>
    </div>
    <div className="flex gap-3 justify-end">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition disabled:opacity-60 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
export const Pagination = ({ page, pages, total, limit, onPage }) => {
  if (pages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between px-1 py-3 border-t border-slate-100 mt-2">
      <span className="text-xs text-slate-400">
        Showing {start}–{end} of {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-8 h-7 text-xs font-semibold rounded-lg transition ${p === page ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          className="px-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && <Icon size={40} className="text-slate-300 mb-4 stroke-[1.5]" />}
    <h3 className="text-base font-semibold text-slate-700">{title}</h3>
    {description && <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ─── Page Header ──────────────────────────────────────────────────────────────
export const PageHeader = ({ title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);

// ─── Form Field ───────────────────────────────────────────────────────────────
export const FormField = ({ label, error, required, children, hint }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
  </div>
);

// ─── Input / Select / Textarea base styles ─────────────────────────────────
export const inputCls = (error) =>
  `w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition focus:ring-2 ${
    error
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
      : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500/20'
  }`;

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner = ({ className = '' }) => (
  <div className={`h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500 ${className}`} />
);

// ─── Loading Page ─────────────────────────────────────────────────────────────
export const LoadingPage = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner />
  </div>
);

// ─── Btn ──────────────────────────────────────────────────────────────────────
export const Btn = ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  return (
    <button disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
};
