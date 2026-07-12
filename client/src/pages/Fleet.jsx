import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleService, tripService } from '../services/dataService';
import { Plus, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  Available: { bg: 'bg-green-500', label: 'Available' },
  'On Trip':  { bg: 'bg-blue-500',  label: 'On Trip' },
  'In Shop':  { bg: 'bg-amber-500', label: 'In Shop' },
  Retired:    { bg: 'bg-red-500',   label: 'Retired' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { bg: 'bg-gray-400', label: status };
  return (
    <span className={`inline-block px-3 py-1 text-xs font-semibold text-white rounded ${s.bg}`}>{s.label}</span>
  );
};

const VEHICLE_TYPES = ['Truck', 'Van', 'Bus', 'Pickup', 'Trailer', 'Refrigerated Truck', 'Motorcycle'];

const Fleet = () => {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState({
    registrationNumber: '', vehicleName: '', model: '', vehicleType: 'Van',
    capacity: '', odometer: '', acquisitionCost: '', status: 'Available',
  });

  const { data: resp, isLoading, isError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll(),
  });

  const { data: tripResp } = useQuery({
    queryKey: ['trips', 'all'],
    queryFn: () => tripService.getAll({ limit: 100 }),
  });

  const vehicles = resp?.data || resp || [];
  const trips = tripResp?.data || tripResp || [];

  const createMutation = useMutation({
    mutationFn: vehicleService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehicle added.'); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add vehicle.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => vehicleService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehicle updated.'); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update.'),
  });

  const deleteMutation = useMutation({
    mutationFn: vehicleService.remove,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehicle removed.'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete.'),
  });

  const openAdd = () => {
    setEditVehicle(null);
    setForm({ registrationNumber: '', vehicleName: '', model: '', vehicleType: 'Van', capacity: '', odometer: '', acquisitionCost: '', status: 'Available' });
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditVehicle(v);
    setForm({
      registrationNumber: v.registrationNumber || '',
      vehicleName: v.vehicleName || '',
      model: v.model || '',
      vehicleType: v.vehicleType || 'Van',
      capacity: v.capacity || '',
      odometer: v.odometer || '',
      acquisitionCost: v.acquisitionCost || '',
      status: v.status || 'Available',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditVehicle(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      odometer: form.odometer ? Number(form.odometer) : 0,
      acquisitionCost: form.acquisitionCost ? Number(form.acquisitionCost) : undefined,
    };
    if (editVehicle) {
      updateMutation.mutate({ id: editVehicle._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = vehicles.filter(v => {
    if (typeFilter !== 'All' && v.vehicleType !== typeFilter) return false;
    if (statusFilter !== 'All' && v.status !== statusFilter) return false;
    if (search && !v.registrationNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Top filters + Add button */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 dark:border-slate-800 rounded px-3 py-1.5 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          <option value="All">Type: All</option>
          {VEHICLE_TYPES.map(t => <option key={t} value={t} className="dark:bg-slate-900">{`Type: ${t}`}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 dark:border-slate-800 rounded px-3 py-1.5 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          <option value="All">Status: All</option>
          {['Available', 'On Trip', 'In Shop', 'Retired'].map(s => <option key={s} value={s} className="dark:bg-slate-900">{`Status: ${s}`}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search reg. no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm border border-gray-300 dark:border-slate-800 rounded px-3 py-1.5 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 w-40"
        />
        <button
          onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded transition hover:opacity-90"
          style={{ backgroundColor: '#f59e0b' }}
        >
          <Plus size={15} />
          Add Vehicle
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 overflow-hidden">
        {isError ? (
          <div className="flex flex-col items-center py-12 text-gray-400 dark:text-slate-500">
            <AlertCircle size={28} className="mb-2 text-red-400" />
            <p>Failed to load vehicles.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800">
                  {['Reg. No.', 'Name/Model', 'Type', 'Capacity', 'Odometer', 'Acq. Cost', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-5 py-3"><div className="h-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  : filtered.length === 0
                  ? <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 dark:text-slate-500">No vehicles found</td></tr>
                  : filtered.map(v => {
                      const completedTrips = trips.filter(t => t.status === 'Completed' && String(t.vehicle?._id || t.vehicle) === String(v._id));
                      const completedDistance = completedTrips.reduce((sum, t) => sum + (t.distance || 0), 0);
                      const currentOdometer = (v.odometer || 0) + completedDistance;
                      return (
                        <tr
                          key={v._id}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                          onClick={() => openEdit(v)}
                        >
                          <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-800 dark:text-slate-200">{v.registrationNumber}</td>
                          <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{v.vehicleName}</td>
                          <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{v.vehicleType}</td>
                          <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{v.capacity ? `${v.capacity} kg` : '—'}</td>
                          <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{currentOdometer.toLocaleString()}</td>
                          <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">
                            {v.acquisitionCost ? v.acquisitionCost.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                          </td>
                          <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
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
          <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200">{editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
              <button onClick={closeModal} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Registration No.</label>
                  <input value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Vehicle Name</label>
                  <input value={form.vehicleName} onChange={e => setForm(f => ({ ...f, vehicleName: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Model (e.g. Tata Ace)</label>
                  <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Type</label>
                  <select value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400">
                    {VEHICLE_TYPES.map(t => <option key={t} className="dark:bg-slate-900">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Capacity (kg)</label>
                  <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Odometer (km)</label>
                  <input type="number" value={form.odometer} onChange={e => setForm(f => ({ ...f, odometer: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Acq. Cost (₹)</label>
                  <input type="number" value={form.acquisitionCost} onChange={e => setForm(f => ({ ...f, acquisitionCost: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400">
                  {['Available', 'On Trip', 'In Shop', 'Retired'].map(s => <option key={s} className="dark:bg-slate-900">{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                {editVehicle && (
                  <button type="button"
                    onClick={() => { if (window.confirm('Delete this vehicle?')) { deleteMutation.mutate(editVehicle._id); closeModal(); } }}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-900/50 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition">
                    Delete
                  </button>
                )}
                <button type="button" onClick={closeModal} className="ml-auto px-4 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold text-white rounded transition disabled:opacity-60"
                  style={{ backgroundColor: '#f59e0b' }}>
                  {editVehicle ? 'Save' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fleet;
