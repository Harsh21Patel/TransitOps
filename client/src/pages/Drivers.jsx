import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverService } from '../services/dataService';
import { Plus, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DUTY_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

const DUTY_STYLE = {
  Available:  { bg: 'bg-green-500',  label: 'Available' },
  'On Trip':  { bg: 'bg-blue-500',   label: 'On Trip' },
  'Off Duty': { bg: 'bg-gray-400',   label: 'Off Duty' },
  Suspended:  { bg: 'bg-orange-500', label: 'Suspended' },
};

const LICENSE_STYLE = {
  Valid:   { bg: 'bg-green-500',  label: 'Available' },
  Expired: { bg: 'bg-red-500',   label: 'Expired' },
};

const DutyBadge = ({ status }) => {
  const s = DUTY_STYLE[status] || { bg: 'bg-gray-400', label: status };
  return <span className={`inline-block px-3 py-1 text-xs font-semibold text-white rounded ${s.bg}`}>{s.label}</span>;
};

const LicenseBadge = ({ expiry }) => {
  const isExpired = expiry && new Date(expiry) < new Date();
  const s = isExpired ? LICENSE_STYLE.Expired : LICENSE_STYLE.Valid;
  return <span className={`inline-block px-3 py-1 text-xs font-semibold text-white rounded ${s.bg}`}>{s.label}</span>;
};

const formatExpiry = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const Drivers = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [form, setForm] = useState({
    name: '', licenseNumber: '', category: 'LMV',
    licenseExpiry: '', contact: '', status: 'Available',
  });

  const { data: resp, isLoading, isError } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverService.getAll(),
  });

  const drivers = resp?.data || resp || [];

  const createMutation = useMutation({
    mutationFn: driverService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Driver added.'); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add driver.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => driverService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Updated.'); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update.'),
  });

  const deleteMutation = useMutation({
    mutationFn: driverService.remove,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Driver removed.'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete.'),
  });

  const openAdd = () => {
    setEditDriver(null);
    setForm({ name: '', licenseNumber: '', category: 'LMV', licenseExpiry: '', contact: '', status: 'Available' });
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditDriver(d);
    setForm({
      name: d.name || '',
      licenseNumber: d.licenseNumber || '',
      category: d.category || 'LMV',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : '',
      contact: d.contact || '',
      status: d.status || 'Available',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditDriver(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editDriver) updateMutation.mutate({ id: editDriver._id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div>
      {/* Add Driver button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded transition hover:opacity-90"
          style={{ backgroundColor: '#f59e0b' }}
        >
          <Plus size={15} /> Add Driver
        </button>
      </div>

      {/* Drivers Table */}
      <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 overflow-hidden">
        {isError ? (
          <div className="flex flex-col items-center py-12 text-gray-400 dark:text-slate-500">
            <AlertCircle size={28} className="mb-2 text-red-400" />
            <p>Failed to load drivers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800">
                  {['Driver', 'License No', 'Category', 'Expiry', 'Contact', 'Trip Compl.', 'Safety', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  : drivers.length === 0
                  ? <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 dark:text-slate-500">No drivers found</td></tr>
                  : drivers.map(d => {
                      const isExpired = d.licenseExpiry && new Date(d.licenseExpiry) < new Date();
                      return (
                        <tr key={d._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition cursor-pointer" onClick={() => openEdit(d)}>
                          <td className="px-4 py-3 text-xs font-medium text-gray-800 dark:text-slate-200">{d.name}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-700 dark:text-slate-300">{d.licenseNumber}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 dark:text-slate-300">{d.category}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 dark:text-slate-300">
                            {formatExpiry(d.licenseExpiry)}
                            {isExpired && (
                              <span className="ml-1 text-red-500 font-semibold">EXPIR.</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 dark:text-slate-300">
                            {d.contact ? `${d.contact.slice(0, 5)}xxxxx` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 dark:text-slate-300">
                            {d.tripCompletionRate != null ? `${d.tripCompletionRate}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 dark:text-slate-300">
                            <div className="flex flex-col gap-1 items-start font-medium">
                              {isExpired ? (
                                <span className="text-red-500 font-bold uppercase">Suspended</span>
                              ) : (
                                <span>{d.safetyScore != null ? d.safetyScore : '—'}</span>
                              )}
                              <LicenseBadge expiry={d.licenseExpiry} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div onClick={e => e.stopPropagation()}>
                              <DutyBadge status={isExpired ? 'Suspended' : d.status} />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200">{editDriver ? 'Edit Driver' : 'Add Driver'}</h3>
              <button onClick={closeModal} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Full Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">License No.</label>
                  <input value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400">
                    {['LMV', 'HMV', 'Motorcycle', 'Commercial', 'Hazmat'].map(c => <option key={c} className="dark:bg-slate-900">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">License Expiry</label>
                  <input type="date" value={form.licenseExpiry} onChange={e => setForm(f => ({ ...f, licenseExpiry: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Contact</label>
                  <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400">
                    {DUTY_STATUSES.map(s => <option key={s} className="dark:bg-slate-900">{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                {editDriver && (
                  <button type="button"
                    onClick={() => { if (window.confirm('Delete this driver?')) { deleteMutation.mutate(editDriver._id); closeModal(); } }}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-900/50 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition">
                    Delete
                  </button>
                )}
                <button type="button" onClick={closeModal} className="ml-auto px-4 py-2 text-sm border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold text-white rounded disabled:opacity-60 transition"
                  style={{ backgroundColor: '#f59e0b' }}>
                  {editDriver ? 'Save' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;
