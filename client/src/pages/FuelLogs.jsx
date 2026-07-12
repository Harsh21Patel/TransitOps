import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Fuel, ChevronDown, X, Zap, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { fuelService, vehicleService } from '../services/dataService';
import {
  Modal, Pagination, EmptyState, PageHeader, FormField,
  inputCls, Btn, LoadingPage
} from '../components/ui';

const schema = z.object({
  vehicle: z.string().min(1, 'Vehicle is required'),
  liters: z.coerce.number().min(0.01, 'Liters must be > 0'),
  fuelPrice: z.coerce.number().min(0, 'Fuel price must be non-negative'),
  odometerAtFillUp: z.coerce.number().min(0).optional(),
  distanceSinceLastFillUp: z.coerce.number().min(0).optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

const FuelForm = ({ onSubmit, loading, vehicles }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const liters = watch('liters');
  const price = watch('fuelPrice');
  const dist = watch('distanceSinceLastFillUp');
  const cost = liters && price ? (liters * price).toFixed(2) : null;
  const efficiency = liters && dist ? (dist / liters).toFixed(2) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Vehicle" error={errors.vehicle?.message} required>
        <select {...register('vehicle')} className={inputCls(errors.vehicle)}>
          <option value="">Select vehicle…</option>
          {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleName} — {v.registrationNumber}</option>)}
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Liters Filled" error={errors.liters?.message} required>
          <input type="number" step="0.01" {...register('liters')} placeholder="45.5" className={inputCls(errors.liters)} />
        </FormField>
        <FormField label="Price per Liter (₹)" error={errors.fuelPrice?.message} required>
          <input type="number" step="0.01" {...register('fuelPrice')} placeholder="94.50" className={inputCls(errors.fuelPrice)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Odometer at Fill-Up (km)" error={errors.odometerAtFillUp?.message}>
          <input type="number" {...register('odometerAtFillUp')} placeholder="12500" className={inputCls(errors.odometerAtFillUp)} />
        </FormField>
        <FormField label="Distance Since Last Fill-Up (km)" error={errors.distanceSinceLastFillUp?.message} hint="Used to compute km/L efficiency">
          <input type="number" step="0.1" {...register('distanceSinceLastFillUp')} placeholder="380" className={inputCls(errors.distanceSinceLastFillUp)} />
        </FormField>
      </div>
      <FormField label="Fill-Up Date" error={errors.date?.message}>
        <input type="date" {...register('date')} className={inputCls(errors.date)} />
      </FormField>
      <FormField label="Notes" error={errors.notes?.message}>
        <input {...register('notes')} placeholder="Pump #4, Station: HP Bhimrad" className={inputCls(errors.notes)} />
      </FormField>

      {/* Live computation preview */}
      {(cost || efficiency) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4">
          {cost && (
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">₹{cost}</div>
              <div className="text-xs text-slate-500 mt-0.5">Total Fill Cost</div>
            </div>
          )}
          {efficiency && (
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{efficiency} km/L</div>
              <div className="text-xs text-slate-500 mt-0.5">Fuel Efficiency</div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Btn type="submit" loading={loading}>Log Fuel Fill-Up</Btn>
      </div>
    </form>
  );
};

const efficiencyColor = (eff) => {
  if (!eff) return 'text-slate-400';
  if (eff >= 12) return 'text-emerald-600';
  if (eff >= 8) return 'text-amber-600';
  return 'text-rose-600';
};

const FuelLogs = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const params = { page, limit: 15, ...(vehicleFilter && { vehicle: vehicleFilter }) };

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-logs', params],
    queryFn: () => fuelService.getAll(params),
    keepPreviousData: true,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', { limit: 100 }],
    queryFn: () => vehicleService.getAll({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: fuelService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fuel-logs'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Fuel log added.'); setAddOpen(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to log fuel.'),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;
  const vehicles = vehiclesData?.data || [];

  // Compute totals
  const totalCost = logs.reduce((a, l) => a + (l.cost || 0), 0);
  const totalLiters = logs.reduce((a, l) => a + (l.liters || 0), 0);
  const avgEfficiency = logs.filter(l => l.efficiency).reduce((a, l, _, arr) => a + l.efficiency / arr.length, 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Fuel Log"
        description="Track fill-ups, costs, and fuel efficiency across the fleet."
        actions={<Btn onClick={() => setAddOpen(true)}><Plus size={16} /> Log Fill-Up</Btn>}
      />

      {/* Summary Cards */}
      {logs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Total Fuel Cost (page)', value: `₹${totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: Fuel, color: 'text-amber-600 bg-amber-50' },
            { label: 'Total Liters (page)', value: `${totalLiters.toFixed(1)} L`, icon: Zap, color: 'text-blue-600 bg-blue-50' },
            { label: 'Avg. Efficiency (page)', value: avgEfficiency ? `${avgEfficiency.toFixed(1)} km/L` : '—', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
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
      )}

      {/* Vehicle filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex gap-3">
        <div className="relative">
          <select value={vehicleFilter} onChange={e => { setVehicleFilter(e.target.value); setPage(1); }} className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-amber-500">
            <option value="">Vehicle: All</option>
            {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleName}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
        {vehicleFilter && <button onClick={() => setVehicleFilter('')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"><X size={13} /> Clear</button>}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Date', 'Vehicle', 'Liters', 'Price/L', 'Total Cost', 'Odometer', 'Dist. (km)', 'Efficiency', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={9} className="py-12"><LoadingPage /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon={Fuel} title="No fuel logs" description="Log the first fill-up to start tracking costs and efficiency." /></td></tr>
              ) : logs.map(log => (
                <tr key={log._id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3.5 text-xs text-slate-600">{new Date(log.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900 text-xs">{log.vehicle?.vehicleName || '—'}</div>
                    <div className="font-mono text-[10px] text-slate-400">{log.vehicle?.registrationNumber}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 font-semibold text-xs">{log.liters} L</td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs">₹{log.fuelPrice}</td>
                  <td className="px-4 py-3.5 font-semibold text-amber-700 text-xs">₹{log.cost?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs">{log.odometerAtFillUp ? `${log.odometerAtFillUp.toLocaleString()} km` : '—'}</td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs">{log.distanceSinceLastFillUp ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-bold ${efficiencyColor(log.efficiency)}`}>
                      {log.efficiency ? `${log.efficiency} km/L` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs max-w-28 truncate">{log.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && <div className="px-4"><Pagination {...pagination} onPage={setPage} /></div>}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Log Fuel Fill-Up" subtitle="Cost and efficiency are auto-computed." size="lg">
        <FuelForm onSubmit={createMutation.mutate} loading={createMutation.isPending} vehicles={vehicles} />
      </Modal>
    </div>
  );
};

export default FuelLogs;
