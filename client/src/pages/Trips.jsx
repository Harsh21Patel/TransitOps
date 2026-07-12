import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripService, vehicleService, driverService } from '../services/dataService';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LIFECYCLE = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

const TRIP_STYLE = {
  Draft:      { bg: 'bg-gray-400',   label: 'Draft' },
  Dispatched: { bg: 'bg-blue-500',   label: 'Dispatched' },
  Completed:  { bg: 'bg-green-500',  label: 'Completed' },
  Cancelled:  { bg: 'bg-red-500',    label: 'Cancelled' },
};

const StatusBadge = ({ status }) => {
  const s = TRIP_STYLE[status] || { bg: 'bg-gray-400', label: status };
  return <span className={`inline-block px-3 py-1 text-xs font-semibold text-white rounded ${s.bg}`}>{s.label}</span>;
};

const Trips = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    source: '', destination: '', vehicleId: '', driverId: '',
    cargoWeight: '', plannedDistance: '',
  });
  const [validationError, setValidationError] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Fetch live board
  const { data: boardResp, isLoading: boardLoading } = useQuery({
    queryKey: ['trips', 'board'],
    queryFn: tripService.getBoard,
    refetchInterval: 15000,
  });

  // Fetch available vehicles only
  const { data: vehicleResp } = useQuery({
    queryKey: ['vehicles', 'available'],
    queryFn: () => vehicleService.getAll({ status: 'Available' }),
  });

  // Fetch available drivers only
  const { data: driverResp } = useQuery({
    queryKey: ['drivers', 'available'],
    queryFn: () => driverService.getAll({ status: 'Available' }),
  });

  const draftTrips = boardResp?.data?.Draft || boardResp?.Draft || [];
  const dispatchedTrips = boardResp?.data?.Dispatched || boardResp?.Dispatched || [];
  const liveTrips = [...draftTrips, ...dispatchedTrips];
  const availableVehicles = vehicleResp?.data || vehicleResp || [];
  const availableDrivers = (driverResp?.data || driverResp || [])
    .filter(d => d.status !== 'Suspended' && (!d.licenseExpiry || new Date(d.licenseExpiry) >= new Date()));

  const selectedVehicle = availableVehicles.find(v => v._id === form.vehicleId);
  const capacityExceeded = selectedVehicle && form.cargoWeight && Number(form.cargoWeight) > Number(selectedVehicle.capacity);

  const createMutation = useMutation({
    mutationFn: tripService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip created as Draft.');
      setForm({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: '', plannedDistance: '' });
      setValidationError('');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create trip.'),
  });

  const dispatchMutation = useMutation({
    mutationFn: (id) => tripService.dispatch(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); toast.success('Trip dispatched.'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Dispatch failed.'),
  });

  const completeMutation = useMutation({
    mutationFn: (id) => tripService.complete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); toast.success('Trip completed.'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to complete.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => tripService.cancel(id, 'Manually cancelled'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); toast.success('Trip cancelled.'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to cancel.'),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (capacityExceeded) { setValidationError(`Capacity exceeded by ${Number(form.cargoWeight) - Number(selectedVehicle.capacity)} kg — dispatch blocked.`); return; }
    setValidationError('');
    createMutation.mutate({
      source: form.source,
      destination: form.destination,
      vehicle: form.vehicleId || undefined,
      driver: form.driverId || undefined,
      cargoWeight: form.cargoWeight ? Number(form.cargoWeight) : undefined,
      distance: form.plannedDistance ? Number(form.plannedDistance) : undefined,
    });
  };

  const currentStep = (status) => LIFECYCLE.indexOf(status);

  return (
    <div className="flex gap-6 flex-wrap lg:flex-nowrap">
      {/* LEFT — Create Trip form */}
      <div className="flex-1 min-w-0" style={{ maxWidth: '460px' }}>
        {/* Lifecycle stepper */}
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Trip Lifecycle</p>
          <div className="flex items-center gap-0">
            {LIFECYCLE.map((step, i) => {
              const activeStep = selectedTrip ? currentStep(selectedTrip.status) : 0;
              const isActive = i <= activeStep;
              const isCurrentActive = i === activeStep;
              return (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isCurrentActive ? 'border-green-500 bg-green-500'
                      : isActive ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-xs mt-1 whitespace-nowrap ${isCurrentActive ? 'text-green-600 dark:text-green-400 font-semibold' : isActive ? 'text-blue-600' : 'text-gray-400 dark:text-slate-500'}`}>
                      {step}
                    </span>
                  </div>
                  {i < LIFECYCLE.length - 1 && (
                    <div className={`h-0.5 w-10 mx-1 mb-4 ${i < (selectedTrip ? currentStep(selectedTrip.status) : 0) ? 'bg-blue-400' : 'bg-gray-200 dark:bg-slate-800'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Create trip form */}
        <form onSubmit={handleCreate} className="space-y-3">
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Create Trip</p>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Source</label>
            <input
              placeholder="Gandhinagar Depot"
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Destination</label>
            <input
              placeholder="Ahmedabad Hub"
              value={form.destination}
              onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Vehicle (Available Only)</label>
            <select
              value={form.vehicleId}
              onChange={e => { setForm(f => ({ ...f, vehicleId: e.target.value })); setValidationError(''); }}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
            >
              <option value="" className="dark:bg-slate-900">Select vehicle...</option>
              {availableVehicles.map(v => (
                <option key={v._id} value={v._id} className="dark:bg-slate-900">
                  {v.vehicleName} – {v.capacity} kg capacity
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Driver (Available Only)</label>
            <select
              value={form.driverId}
              onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
            >
              <option value="" className="dark:bg-slate-900">Select driver...</option>
              {availableDrivers.map(d => (
                <option key={d._id} value={d._id} className="dark:bg-slate-900">{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Cargo Weight (kg)</label>
            <input
              type="number"
              placeholder="700"
              value={form.cargoWeight}
              onChange={e => { setForm(f => ({ ...f, cargoWeight: e.target.value })); setValidationError(''); }}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Planned Distance (km)</label>
            <input
              type="number"
              placeholder="38"
              value={form.plannedDistance}
              onChange={e => setForm(f => ({ ...f, plannedDistance: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Capacity validation error box */}
          {(capacityExceeded || validationError) && selectedVehicle && (
            <div className="border-2 border-red-300 dark:border-red-900 rounded p-3 bg-red-50 dark:bg-red-950/20 text-xs">
              <p className="text-gray-700 dark:text-slate-300">Vehicle Capacity: {selectedVehicle.capacity} kg</p>
              <p className="text-gray-700 dark:text-slate-300">Cargo Weight: {form.cargoWeight} kg</p>
              <p className="text-red-500 font-semibold flex items-center gap-1 mt-1">
                <span>✕</span>
                Capacity exceeded by {Number(form.cargoWeight) - Number(selectedVehicle.capacity)} kg — dispatch blocked
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending || !!capacityExceeded}
              className="flex-1 py-2 text-sm font-semibold text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: capacityExceeded ? '#9ca3af' : '#3b82f6' }}
            >
              {capacityExceeded ? 'Dispatch (disabled)' : createMutation.isPending ? 'Creating…' : 'Create Trip'}
            </button>
            <button
              type="button"
              onClick={() => { setForm({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: '', plannedDistance: '' }); setValidationError(''); }}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT — Live Board */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Live Board</p>
        {boardLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b border-gray-200 dark:border-slate-800 pb-3 animate-pulse">
                <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : liveTrips.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400 dark:text-slate-500">
            <AlertCircle size={24} className="mb-2" />
            <p className="text-sm">No active trips</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-gray-100 dark:divide-slate-800">
            {liveTrips.map(trip => (
              <div
                key={trip._id}
                className={`py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 px-2 rounded transition ${selectedTrip?._id === trip._id ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                onClick={() => setSelectedTrip(trip === selectedTrip ? null : trip)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-gray-800 dark:text-slate-200">{trip.tripCode}</span>
                    <p className="text-xs text-gray-600 dark:text-slate-350 mt-0.5">{trip.source} → {trip.destination}</p>
                    <div className="mt-1.5"><StatusBadge status={trip.status} /></div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {trip.vehicle?.vehicleName || 'Unassigned'}{trip.driver?.name ? ` / ${trip.driver.name.split(' ')[0]}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      {trip.status === 'Draft' ? 'Awaiting driver'
                        : trip.status === 'Dispatched' ? '45 min'
                        : trip.status === 'Cancelled' ? 'Vehicle went to shop'
                        : '—'}
                    </p>
                  </div>
                </div>
                {/* Action buttons for selected trip */}
                {selectedTrip?._id === trip._id && trip.status !== 'Completed' && trip.status !== 'Cancelled' && (
                  <div className="flex gap-2 mt-3">
                    {trip.status === 'Draft' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); dispatchMutation.mutate(trip._id); }}
                        className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded hover:bg-blue-600 transition"
                      >
                        Dispatch
                      </button>
                    )}
                    {trip.status === 'Dispatched' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); completeMutation.mutate(trip._id); }}
                        className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded hover:bg-green-600 transition"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(trip._id); }}
                      className="px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded hover:bg-red-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trips;
