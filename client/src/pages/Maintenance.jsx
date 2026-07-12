import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Wrench, CheckCircle2, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { maintenanceService, vehicleService } from '../services/dataService';
import { SERVICE_TYPES } from '../constants/enums';
import {
  StatusBadge, Modal, ConfirmDialog, Pagination,
  EmptyState, PageHeader, FormField, inputCls, Btn, LoadingPage
} from '../components/ui';

const schema = z.object({
  vehicle: z.string().min(1, 'Vehicle is required'),
  serviceType: z.string().min(1, 'Service type is required'),
  cost: z.coerce.number().min(0, 'Cost must be non-negative'),
  date: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});

const MaintenanceForm = ({ onSubmit, loading, vehicles }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Vehicle" error={errors.vehicle?.message} required>
        <select {...register('vehicle')} className={inputCls(errors.vehicle)}>
          <option value="">Select vehicle…</option>
          {vehicles.map(v => (
            <option key={v._id} value={v._id}>{v.vehicleName} — {v.registrationNumber} ({v.status})</option>
          ))}
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Service Type" error={errors.serviceType?.message} required>
          <select {...register('serviceType')} className={inputCls(errors.serviceType)}>
            <option value="">Select service…</option>
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Cost (₹)" error={errors.cost?.message} required>
          <input type="number" {...register('cost')} placeholder="3500" className={inputCls(errors.cost)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Service Date" error={errors.date?.message}>
          <input type="date" {...register('date')} className={inputCls(errors.date)} />
        </FormField>
        <FormField label="Vendor / Workshop" error={errors.vendor?.message}>
          <input {...register('vendor')} placeholder="Raju Auto Works" className={inputCls(errors.vendor)} />
        </FormField>
      </div>
      <FormField label="Notes" error={errors.notes?.message}>
        <textarea {...register('notes')} placeholder="Details about the service…" className={`${inputCls(errors.notes)} resize-none h-20`} />
      </FormField>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
        <strong>Business Rule:</strong> Creating a maintenance record will automatically set the vehicle status to <strong>In Shop</strong>, removing it from dispatch selection until closed.
      </div>
      <div className="flex justify-end pt-2">
        <Btn type="submit" loading={loading}>Open Maintenance Record</Btn>
      </div>
    </form>
  );
};

const Maintenance = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(null);

  const params = { page, limit: 15, ...(statusFilter && { status: statusFilter }) };

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', params],
    queryFn: () => maintenanceService.getAll(params),
    keepPreviousData: true,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', { limit: 100, noRetired: 1 }],
    queryFn: () => vehicleService.getAll({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: maintenanceService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); qc.invalidateQueries({ queryKey: ['vehicles'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Maintenance opened. Vehicle is now In Shop.'); setAddOpen(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to open maintenance.'),
  });

  const closeMutation = useMutation({
    mutationFn: maintenanceService.close,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); qc.invalidateQueries({ queryKey: ['vehicles'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Maintenance closed. Vehicle restored to Available.'); setCloseConfirm(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to close maintenance.'),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;
  const vehicles = vehiclesData?.data?.filter(v => v.status !== 'Retired') || [];

  return (
    <div className="p-6">
      <PageHeader
        title="Maintenance Logs"
        description="Track vehicle service records and manage In Shop status automatically."
        actions={<Btn onClick={() => setAddOpen(true)}><Plus size={16} /> Open Maintenance</Btn>}
      />

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex gap-3">
        <div className="relative">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-amber-500">
            <option value="">Status: All</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
        {statusFilter && <button onClick={() => setStatusFilter('')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"><X size={13} /> Clear</button>}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Vehicle', 'Service Type', 'Cost', 'Date', 'Vendor', 'Notes', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12"><LoadingPage /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon={Wrench} title="No maintenance records" description="Open a record to track a vehicle service." /></td></tr>
              ) : logs.map(log => (
                <tr key={log._id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900 text-xs">{log.vehicle?.vehicleName || '—'}</div>
                    <div className="font-mono text-[10px] text-slate-400">{log.vehicle?.registrationNumber}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 font-medium text-xs">{log.serviceType}</td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs">₹{log.cost?.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs">{new Date(log.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs">{log.vendor || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs max-w-32 truncate">{log.notes || '—'}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={log.status} /></td>
                  <td className="px-4 py-3.5">
                    {log.status === 'Active' && (
                      <button onClick={() => setCloseConfirm(log)} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
                        <CheckCircle2 size={11} /> Close
                      </button>
                    )}
                    {log.status === 'Completed' && log.completedDate && (
                      <span className="text-[10px] text-slate-400">Closed {new Date(log.completedDate).toLocaleDateString('en-IN')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && <div className="px-4"><Pagination {...pagination} onPage={setPage} /></div>}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Open Maintenance Record" subtitle="Vehicle status will be set to In Shop automatically." size="lg">
        <MaintenanceForm onSubmit={createMutation.mutate} loading={createMutation.isPending} vehicles={vehicles} />
      </Modal>

      <ConfirmDialog
        open={!!closeConfirm}
        onClose={() => setCloseConfirm(null)}
        onConfirm={() => closeMutation.mutate(closeConfirm._id)}
        loading={closeMutation.isPending}
        title="Close Maintenance Record"
        message={`Close maintenance for ${closeConfirm?.vehicle?.vehicleName}? The vehicle will be restored to Available status.`}
        confirmLabel="Close & Restore Vehicle"
        danger={false}
      />
    </div>
  );
};

export default Maintenance;
