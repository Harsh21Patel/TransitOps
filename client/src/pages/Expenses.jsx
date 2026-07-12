import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, DollarSign, ChevronDown, X, Calculator, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { expenseService, vehicleService, tripService } from '../services/dataService';
import { EXPENSE_TYPES } from '../constants/enums';
import {
  Modal, Pagination, EmptyState, PageHeader, FormField,
  inputCls, Btn, LoadingPage
} from '../components/ui';

const schema = z.object({
  type: z.enum(EXPENSE_TYPES, { required_error: 'Type is required' }),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  vehicle: z.string().optional().or(z.literal('')),
  trip: z.string().optional().or(z.literal('')),
  date: z.string().optional(),
  description: z.string().optional(),
});

const ExpenseForm = ({ onSubmit, loading, vehicles, trips }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Expense Type" error={errors.type?.message} required>
          <select {...register('type')} className={inputCls(errors.type)}>
            <option value="">Select type…</option>
            {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Amount (₹)" error={errors.amount?.message} required>
          <input type="number" step="0.01" {...register('amount')} placeholder="120.00" className={inputCls(errors.amount)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Associated Vehicle (Optional)" error={errors.vehicle?.message}>
          <select {...register('vehicle')} className={inputCls(errors.vehicle)}>
            <option value="">None</option>
            {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleName} ({v.registrationNumber})</option>)}
          </select>
        </FormField>
        <FormField label="Associated Trip (Optional)" error={errors.trip?.message}>
          <select {...register('trip')} className={inputCls(errors.trip)}>
            <option value="">None</option>
            {trips.map(t => <option key={t._id} value={t._id}>{t.tripCode} ({t.source} → {t.destination})</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Expense Date" error={errors.date?.message}>
        <input type="date" {...register('date')} className={inputCls(errors.date)} />
      </FormField>
      <FormField label="Description" error={errors.description?.message}>
        <textarea {...register('description')} placeholder="e.g. Fastag toll deduction at toll plaza" className={`${inputCls(errors.description)} resize-none h-20`} />
      </FormField>
      <div className="flex justify-end pt-2">
        <Btn type="submit" loading={loading}>Log Expense</Btn>
      </div>
    </form>
  );
};

const Expenses = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const params = { page, limit: 15, ...(typeFilter && { type: typeFilter }), ...(vehicleFilter && { vehicle: vehicleFilter }) };

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expenseService.getAll(params),
    keepPreviousData: true,
  });

  const { data: costData } = useQuery({
    queryKey: ['operational-cost'],
    queryFn: () => expenseService.getOperationalCost(),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', { limit: 100 }],
    queryFn: () => vehicleService.getAll({ limit: 100 }),
  });

  const { data: tripsData } = useQuery({
    queryKey: ['trips', { limit: 100 }],
    queryFn: () => tripService.getAll({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: expenseService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['operational-cost'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Expense logged.');
      setAddOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to log expense.'),
  });

  const expenses = data?.data || [];
  const pagination = data?.pagination;
  const vehicles = vehiclesData?.data || [];
  const trips = tripsData?.data || [];
  const summary = costData?.data || {};

  return (
    <div className="p-6">
      <PageHeader
        title="Expense Logs"
        description="Track vehicle operating costs, tolls, parking fees, and general expenses."
        actions={<Btn onClick={() => setAddOpen(true)}><Plus size={16} /> Log Expense</Btn>}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Operational Cost', value: `₹${(summary.operationalCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: Calculator, color: 'text-amber-600 bg-amber-50' },
          { label: 'Fuel Spend', value: `₹${(summary.fuel || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
          { label: 'Maintenance Spend', value: `₹${(summary.maintenance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: CreditCard, color: 'text-purple-600 bg-purple-50' },
          { label: 'Tolls & Parking', value: `₹${((summary.toll || 0) + (summary.parking || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: CreditCard, color: 'text-emerald-600 bg-emerald-50' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${c.color}`}>
              <c.icon size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{c.value}</div>
              <div className="text-xs text-slate-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex gap-3">
        <div className="relative">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-amber-500">
            <option value="">Type: All</option>
            {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
        <div className="relative">
          <select value={vehicleFilter} onChange={e => { setVehicleFilter(e.target.value); setPage(1); }} className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-amber-500">
            <option value="">Vehicle: All</option>
            {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleName}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
        {(typeFilter || vehicleFilter) && (
          <button onClick={() => { setTypeFilter(''); setVehicleFilter(''); setPage(1); }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
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
                {['Date', 'Type', 'Amount', 'Vehicle', 'Associated Trip', 'Description'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-12"><LoadingPage /></td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={DollarSign} title="No expenses logged" description="Log fees or Toll expenses to track fleet overhead." /></td></tr>
              ) : expenses.map(e => (
                <tr key={e._id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3.5 text-xs text-slate-600">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3.5"><span className="text-xs font-semibold text-slate-900">{e.type}</span></td>
                  <td className="px-4 py-3.5 font-semibold text-rose-600 text-xs">₹{e.amount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{e.vehicle?.vehicleName || '—'}</td>
                  <td className="px-4 py-3.5 text-xs font-mono text-amber-700">{e.trip?.tripCode || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">{e.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && <div className="px-4"><Pagination {...pagination} onPage={setPage} /></div>}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Log Expense" subtitle="Record tolls, parking, or custom operational costs.">
        <ExpenseForm
          onSubmit={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
          vehicles={vehicles}
          trips={trips}
        />
      </Modal>
    </div>
  );
};

export default Expenses;
