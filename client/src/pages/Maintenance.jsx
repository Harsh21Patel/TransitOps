import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService, vehicleService } from '../services/dataService';
import toast from 'react-hot-toast';

const SERVICE_TYPES = [
  'Oil Change',
  'Tire Replacement',
  'Brake Service',
  'Engine Repair',
  'Transmission Service',
  'AC Service',
  'General Inspection',
  'Bodywork',
  'Electrical Repair',
  'Other',
];

const STATUS_STYLE = {
  Active:    { bg: 'bg-amber-500', label: 'In Shop' },
  'In Shop': { bg: 'bg-amber-500', label: 'In Shop' },
  Completed: { bg: 'bg-green-500', label: 'Completed' },
  Scheduled: { bg: 'bg-blue-500',  label: 'Scheduled' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { bg: 'bg-gray-400', label: status };
  return <span className={`inline-block px-3 py-1 text-xs font-semibold text-white rounded ${s.bg}`}>{s.label}</span>;
};

const Maintenance = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    vehicle: '', serviceType: 'Oil Change', cost: '',
    date: new Date().toISOString().slice(0, 10), status: 'Active', notes: '',
  });

  const { data: maintResp, isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => maintenanceService.getAll(),
  });

  const { data: vehicleResp } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll(),
  });

  const records = maintResp?.data || maintResp || [];
  const vehicles = vehicleResp?.data || vehicleResp || [];

  const createMutation = useMutation({
    mutationFn: maintenanceService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Service record saved. Vehicle marked In Shop.');
      setForm({ vehicle: '', serviceType: 'Oil Change', cost: '', date: new Date().toISOString().slice(0, 10), status: 'Active', notes: '' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save record.'),
  });

  const closeMutation = useMutation({
    mutationFn: (id) => maintenanceService.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Record closed. Vehicle marked Available.');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to close record.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.vehicle) { toast.error('Select a vehicle.'); return; }
    createMutation.mutate({
      vehicle: form.vehicle,
      serviceType: form.serviceType,
      cost: form.cost ? Number(form.cost) : undefined,
      date: form.date,
      notes: form.notes,
    });
  };

  return (
    <div className="flex gap-8 flex-wrap lg:flex-nowrap">
      {/* LEFT — Log Service Record form */}
      <div style={{ minWidth: '300px', maxWidth: '380px' }}>
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Log Service Record</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Vehicle</label>
            <select
              value={form.vehicle}
              onChange={e => setForm(f => ({ ...f, vehicle: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
              required
            >
              <option value="" className="dark:bg-slate-900">Select vehicle...</option>
              {vehicles.map(v => (
                <option key={v._id} value={v._id} className="dark:bg-slate-900">{v.vehicleName} — {v.registrationNumber}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Service Type</label>
            <select
              value={form.serviceType}
              onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
            >
              {SERVICE_TYPES.map(t => <option key={t} className="dark:bg-slate-900">{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Cost (₹)</label>
            <input
              type="number"
              placeholder="2500"
              value={form.cost}
              onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
            >
              <option value="Active" className="dark:bg-slate-900">Active (In Shop)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-2.5 text-sm font-semibold text-white rounded transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#f59e0b' }}
          >
            {createMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>

      </div>

      {/* RIGHT — Service Log table */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Service Log</p>
        <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800">
                  {['Vehicle', 'Service', 'Cost', 'Date', 'Status', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {isLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-5 py-3"><div className="h-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  : records.length === 0
                  ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400 dark:text-slate-500 text-sm">No service records</td></tr>
                  : records.map(r => (
                      <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3 text-xs font-medium text-gray-800 dark:text-slate-200">
                          {r.vehicle?.vehicleName || r.vehicle?.registrationNumber || '—'}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{r.serviceType}</td>
                        <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">
                          {r.cost != null ? `₹${r.cost.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">
                          {r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-5 py-3">
                          {(r.status === 'Active' || r.status === 'In Shop') && (
                            <button
                              onClick={() => closeMutation.mutate(r._id)}
                              disabled={closeMutation.isPending}
                              className="text-xs text-blue-650 dark:text-blue-400 hover:underline disabled:opacity-50"
                            >
                              Close
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
