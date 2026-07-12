import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Compass, ChevronDown, X, CheckCircle2, XCircle, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { tripService, vehicleService, driverService } from '../services/dataService';
import {
  StatusBadge, Modal, ConfirmDialog, Pagination,
  EmptyState, PageHeader, FormField, inputCls, Btn, LoadingPage, Spinner
} from '../components/ui';

const TRIP_STATUSES = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

const schema = z.object({
  source: z.string().min(1, 'Source is required'),
  destination: z.string().min(1, 'Destination is required'),
  vehicle: z.string().min(1, 'Vehicle is required'),
  driver: z.string().min(1, 'Driver is required'),
  cargoWeight: z.coerce.number().min(0.1, 'Cargo weight must be > 0'),
  distance: z.coerce.number().min(0.1, 'Distance must be > 0'),
});

const TripForm = ({ onSubmit, loading, vehicles, drivers }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const selectedVehicleId = watch('vehicle');
  const selectedVehicle = vehicles.find(v => v._id === selectedVehicleId);
  const cargoWeight = watch('cargoWeight');
  const overCapacity = selectedVehicle && cargoWeight && Number(cargoWeight) > selectedVehicle.capacity;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Source" error={errors.source?.message} required>
          <input {...register('source')} placeholder="Gandhinagar Depot" className={inputCls(errors.source)} />
        </FormField>
        <FormField label="Destination" error={errors.destination?.message} required>
          <input {...register('destination')} placeholder="Ahmedabad Hub" className={inputCls(errors.destination)} />
        </FormField>
      </div>
      <FormField label="Vehicle (Available Only)" error={errors.vehicle?.message} required>
        <select {...register('vehicle')} className={inputCls(errors.vehicle)}>
          <option value="">Select vehicle…</option>
          {vehicles.map(v => (
            <option key={v._id} value={v._id}>
              {v.vehicleName} — {v.registrationNumber} (Cap: {v.capacity} kg)
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Driver (Available Only)" error={errors.driver?.message} required>
        <select {...register('driver')} className={inputCls(errors.driver)}>
          <option value="">Select driver…</option>
          {drivers.map(d => (
            <option key={d._id} value={d._id}>
              {d.name} — {d.licenseNumber} ({d.category})
            </option>
          ))}
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cargo Weight (kg)" error={errors.cargoWeight?.message} required>
          <input type="number" step="0.1" {...register('cargoWeight')} placeholder="450" className={inputCls(errors.cargoWeight)} />
        </FormField>
        <FormField label="Planned Distance (km)" error={errors.distance?.message} required>
          <input type="number" step="0.1" {...register('distance')} placeholder="38" className={inputCls(errors.distance)} />
        </FormField>
      </div>

      {/* Capacity validation warning */}
      {selectedVehicle && cargoWeight && (
        <div className={`rounded-lg p-3 text-sm ${overCapacity ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
          {overCapacity ? (
            <>
              <div className="flex items-center gap-2 font-semibold"><AlertCircle size={15} /> Capacity Exceeded — Dispatch Blocked</div>
              <div className="mt-1 text-xs">Vehicle Capacity: {selectedVehicle.capacity} kg · Cargo Weight: {cargoWeight} kg · Excess: {Number(cargoWeight) - selectedVehicle.capacity} kg</div>
            </>
          ) : (
            <div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={15} /> Cargo within vehicle capacity — Dispatch allowed</div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Btn type="submit" loading={loading} disabled={overCapacity}>Create Trip (Draft)</Btn>
      </div>
    </form>
  );
};

const CancelForm = ({ onSubmit, loading, onClose }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="space-y-4">
      <FormField label="Cancellation Reason">
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Describe the reason for cancellation…"
          className={`${inputCls(false)} resize-none h-24`}
        />
      </FormField>
      <div className="flex justify-end gap-3">
        <Btn variant="secondary" onClick={onClose}>Back</Btn>
        <Btn variant="danger" loading={loading} onClick={() => onSubmit(reason)}>Cancel Trip</Btn>
      </div>
    </div>
  );
};

// Trip lifecycle progress indicator
const LifecycleBadge = ({ status }) => {
  const steps = ['Draft', 'Dispatched', 'Completed'];
  const activeIdx = steps.indexOf(status);
  if (status === 'Cancelled') {
    return (
      <div className="flex items-center gap-2">
        <XCircle size={14} className="text-rose-500" />
        <span className="text-xs text-rose-600 font-semibold">Cancelled</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`h-2 w-2 rounded-full ${i <= activeIdx ? 'bg-amber-500' : 'bg-slate-200'}`} />
          <span className={`text-[10px] font-medium ${i <= activeIdx ? 'text-amber-700' : 'text-slate-400'}`}>{s}</span>
          {i < steps.length - 1 && <div className={`h-px w-4 ${i < activeIdx ? 'bg-amber-400' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
};

const Trips = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [cancelTrip, setCancelTrip] = useState(null);
  const [dispatchConfirm, setDispatchConfirm] = useState(null);
  const [completeConfirm, setCompleteConfirm] = useState(null);

  const params = { page, limit: 15, ...(statusFilter && { status: statusFilter }) };

  const { data, isLoading } = useQuery({
    queryKey: ['trips', params],
    queryFn: () => tripService.getAll(params),
    keepPreviousData: true,
  });

  // Fetch only available vehicles & drivers for the create form
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', { status: 'Available', limit: 100 }],
    queryFn: () => vehicleService.getAll({ status: 'Available', limit: 100 }),
  });
  const { data: driversData } = useQuery({
    queryKey: ['drivers', { status: 'Available', limit: 100 }],
    queryFn: () => driverService.getAll({ status: 'Available', limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: tripService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Trip created as Draft.'); setAddOpen(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create trip.'),
  });

  const dispatchMutation = useMutation({
    mutationFn: tripService.dispatch,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['vehicles'] }); qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Trip dispatched! Vehicle and driver are now On Trip.'); setDispatchConfirm(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Dispatch failed.'),
  });

  const completeMutation = useMutation({
    mutationFn: tripService.complete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['vehicles'] }); qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Trip completed. Vehicle and driver now Available.'); setCompleteConfirm(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to complete trip.'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => tripService.cancel(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['vehicles'] }); qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Trip cancelled. Resources restored.'); setCancelTrip(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to cancel trip.'),
  });

  const trips = data?.data || [];
  const pagination = data?.pagination;
  const availableVehicles = vehiclesData?.data || [];
  const availableDrivers = driversData?.data?.filter(d => !d.isLicenseExpired && d.status === 'Available') || [];

  return (
    <div className="p-6">
      <PageHeader
        title="Trip Dispatch"
        description="Create, dispatch, complete, and cancel transport operations."
        actions={<Btn onClick={() => setAddOpen(true)}><Plus size={16} /> New Trip</Btn>}
      />

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex gap-3">
        <div className="relative">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-amber-500">
            <option value="">Status: All</option>
            {TRIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                {['Trip Code', 'Route', 'Vehicle', 'Driver', 'Cargo', 'Dist.', 'Lifecycle', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12"><LoadingPage /></td></tr>
              ) : trips.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon={Compass} title="No trips found" description="Create a new trip to get started." /></td></tr>
              ) : trips.map(t => (
                <tr key={t._id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3.5 font-mono font-bold text-xs text-amber-700">{t.tripCode}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900 text-xs">{t.source}</div>
                    <div className="text-slate-400 text-xs">→ {t.destination}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{t.vehicle?.vehicleName || '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{t.driver?.name || '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{t.cargoWeight} kg</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{t.distance} km</td>
                  <td className="px-4 py-3.5"><LifecycleBadge status={t.status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {t.status === 'Draft' && (
                        <>
                          <button onClick={() => setDispatchConfirm(t)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                            <Send size={10} /> Dispatch
                          </button>
                          <button onClick={() => setCancelTrip(t)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition">
                            Cancel
                          </button>
                        </>
                      )}
                      {t.status === 'Dispatched' && (
                        <>
                          <button onClick={() => setCompleteConfirm(t)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
                            <CheckCircle2 size={10} /> Complete
                          </button>
                          <button onClick={() => setCancelTrip(t)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition">
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && <div className="px-4"><Pagination {...pagination} onPage={setPage} /></div>}
      </div>

      {/* Create Trip Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Create New Trip" subtitle="Only available vehicles and eligible drivers are shown." size="lg">
        <TripForm onSubmit={createMutation.mutate} loading={createMutation.isPending} vehicles={availableVehicles} drivers={availableDrivers} />
      </Modal>

      {/* Dispatch Confirm */}
      <ConfirmDialog
        open={!!dispatchConfirm}
        onClose={() => setDispatchConfirm(null)}
        onConfirm={() => dispatchMutation.mutate(dispatchConfirm._id)}
        loading={dispatchMutation.isPending}
        title="Dispatch Trip"
        message={`Dispatch ${dispatchConfirm?.tripCode}? Vehicle ${dispatchConfirm?.vehicle?.vehicleName} and driver ${dispatchConfirm?.driver?.name} will be set to On Trip.`}
        confirmLabel="Dispatch"
        danger={false}
      />

      {/* Complete Confirm */}
      <ConfirmDialog
        open={!!completeConfirm}
        onClose={() => setCompleteConfirm(null)}
        onConfirm={() => completeMutation.mutate(completeConfirm._id)}
        loading={completeMutation.isPending}
        title="Complete Trip"
        message={`Mark ${completeConfirm?.tripCode} as completed? Vehicle and driver will be restored to Available.`}
        confirmLabel="Complete Trip"
        danger={false}
      />

      {/* Cancel Modal */}
      <Modal open={!!cancelTrip} onClose={() => setCancelTrip(null)} title="Cancel Trip" subtitle={cancelTrip?.tripCode} size="sm">
        <CancelForm
          onClose={() => setCancelTrip(null)}
          loading={cancelMutation.isPending}
          onSubmit={(reason) => cancelMutation.mutate({ id: cancelTrip._id, reason })}
        />
      </Modal>
    </div>
  );
};

export default Trips;
