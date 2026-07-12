import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Users, Edit2, Trash2, ChevronDown, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { driverService } from '../services/dataService';
import {
  StatusBadge, Modal, ConfirmDialog, Pagination,
  EmptyState, PageHeader, FormField, inputCls, Btn, LoadingPage
} from '../components/ui';

const LICENSE_CATEGORIES = ['LMV', 'HMV', 'Motorcycle', 'Commercial', 'Hazmat'];
const DRIVER_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  category: z.enum(LICENSE_CATEGORIES, { required_error: 'Category is required' }),
  licenseExpiry: z.string().min(1, 'Expiry date is required'),
  contact: z.string().min(10, 'Valid contact number required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  safetyScore: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(DRIVER_STATUSES).optional(),
});

const DriverForm = ({ defaultValues, onSubmit, loading, isEdit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? { ...defaultValues, licenseExpiry: defaultValues.licenseExpiry ? new Date(defaultValues.licenseExpiry).toISOString().split('T')[0] : '' }
      : { safetyScore: 100, status: 'Available' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Full Name" error={errors.name?.message} required>
          <input {...register('name')} placeholder="Alex Sharma" className={inputCls(errors.name)} />
        </FormField>
        <FormField label="License Number" error={errors.licenseNumber?.message} required>
          <input {...register('licenseNumber')} placeholder="DL88213" className={inputCls(errors.licenseNumber)} style={{ textTransform: 'uppercase' }} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="License Category" error={errors.category?.message} required>
          <select {...register('category')} className={inputCls(errors.category)}>
            <option value="">Select category…</option>
            {LICENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="License Expiry" error={errors.licenseExpiry?.message} required>
          <input type="date" {...register('licenseExpiry')} className={inputCls(errors.licenseExpiry)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Contact Number" error={errors.contact?.message} required>
          <input {...register('contact')} placeholder="9876500001" className={inputCls(errors.contact)} />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <input type="email" {...register('email')} placeholder="driver@example.com" className={inputCls(errors.email)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Safety Score (0–100)" error={errors.safetyScore?.message}>
          <input type="number" {...register('safetyScore')} placeholder="100" min="0" max="100" className={inputCls(errors.safetyScore)} />
        </FormField>
        {isEdit && (
          <FormField label="Status" error={errors.status?.message}>
            <select {...register('status')} className={inputCls(errors.status)}>
              {DRIVER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Btn type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Add Driver'}
        </Btn>
      </div>
    </form>
  );
};

const safetyColor = (score) => {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-rose-600';
};

const Drivers = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [deleteDriver, setDeleteDriver] = useState(null);

  const params = { page, limit: 10, ...(search && { search }), ...(statusFilter && { status: statusFilter }) };

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', params],
    queryFn: () => driverService.getAll(params),
    keepPreviousData: true,
  });

  const { data: expiringData } = useQuery({
    queryKey: ['drivers', 'expiring'],
    queryFn: () => driverService.getExpiring(60),
  });

  const createMutation = useMutation({
    mutationFn: driverService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Driver added.'); setAddOpen(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add driver.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => driverService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Driver updated.'); setEditDriver(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update driver.'),
  });

  const deleteMutation = useMutation({
    mutationFn: driverService.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Driver deleted.'); setDeleteDriver(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete driver.'),
  });

  const drivers = data?.data || [];
  const pagination = data?.pagination;
  const expiring = expiringData?.data || [];

  const isExpired = (date) => date && new Date(date) < new Date();
  const isExpiringSoon = (date) => {
    if (!date) return false;
    const exp = new Date(date);
    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    return exp > now && exp <= soon;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Drivers & Safety Profiles"
        description="Manage driver records, license validity, and safety compliance."
        actions={<Btn onClick={() => setAddOpen(true)}><Plus size={16} /> Add Driver</Btn>}
      />

      {/* Expiry Alert Banner */}
      {expiring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {expiring.length} driver license{expiring.length > 1 ? 's' : ''} expiring within 60 days
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {expiring.map(d => d.name).join(', ')} — review and renew promptly to maintain dispatch eligibility.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, license…" className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 transition" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-amber-500">
            <option value="">Status: All</option>
            {DRIVER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Driver', 'License No.', 'Category', 'Expiry', 'Contact', 'Safety Score', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12"><LoadingPage /></td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon={Users} title="No drivers found" description="Add your first driver or adjust the filters." /></td></tr>
              ) : drivers.map(d => {
                const expired = isExpired(d.licenseExpiry);
                const soon = isExpiringSoon(d.licenseExpiry);
                return (
                  <tr key={d._id} className="hover:bg-slate-50/70 transition group">
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{d.name}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-700">{d.licenseNumber}</td>
                    <td className="px-4 py-3.5 text-slate-600">{d.category}</td>
                    <td className="px-4 py-3.5">
                      <div className={`text-xs font-medium ${expired ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-slate-600'}`}>
                        {d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString('en-IN', { month: '2-digit', year: 'numeric' }) : '—'}
                        {expired && <span className="ml-1 text-[10px] font-bold uppercase">EXPIRED</span>}
                        {soon && !expired && <span className="ml-1 text-[10px] font-bold uppercase">SOON</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{d.contact}</td>
                    <td className="px-4 py-3.5">
                      <span className={`font-bold text-sm ${safetyColor(d.safetyScore)}`}>{d.safetyScore}%</span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setEditDriver(d)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteDriver(d)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pagination && <div className="px-4"><Pagination {...pagination} onPage={setPage} /></div>}
      </div>

      <p className="mt-3 text-xs text-amber-600">
        Rule: Expired license or Suspended status → blocked from trip assignment.
      </p>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Driver" subtitle="Register a new driver with safety profile.">
        <DriverForm onSubmit={createMutation.mutate} loading={createMutation.isPending} isEdit={false} />
      </Modal>

      <Modal open={!!editDriver} onClose={() => setEditDriver(null)} title="Edit Driver" subtitle={editDriver?.name}>
        {editDriver && (
          <DriverForm
            defaultValues={editDriver}
            onSubmit={(data) => updateMutation.mutate({ id: editDriver._id, data })}
            loading={updateMutation.isPending}
            isEdit
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteDriver}
        onClose={() => setDeleteDriver(null)}
        onConfirm={() => deleteMutation.mutate(deleteDriver._id)}
        loading={deleteMutation.isPending}
        title="Delete Driver"
        message={`Permanently delete driver ${deleteDriver?.name}? This cannot be undone.`}
        confirmLabel="Delete Driver"
      />
    </div>
  );
};

export default Drivers;
