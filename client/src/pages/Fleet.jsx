import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Truck, Edit2, Trash2, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { vehicleService } from '../services/dataService';
import {
  StatusBadge, Modal, ConfirmDialog, Pagination,
  EmptyState, PageHeader, FormField, inputCls, Btn, LoadingPage
} from '../components/ui';

const VEHICLE_TYPES = ['Truck', 'Van', 'Bus', 'Pickup', 'Trailer', 'Refrigerated Truck', 'Motorcycle'];
const VEHICLE_STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];

const schema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required').toUpperCase(),
  vehicleName: z.string().min(1, 'Vehicle name is required'),
  model: z.string().min(1, 'Model is required'),
  vehicleType: z.enum(VEHICLE_TYPES, { required_error: 'Vehicle type is required' }),
  capacity: z.coerce.number().min(1, 'Capacity must be greater than 0'),
  acquisitionCost: z.coerce.number().min(0, 'Acquisition cost must be non-negative'),
  odometer: z.coerce.number().min(0).optional(),
  status: z.enum(VEHICLE_STATUSES).optional(),
});

const VehicleForm = ({ defaultValues, onSubmit, loading, isEdit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { odometer: 0, status: 'Available' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Registration Number" error={errors.registrationNumber?.message} required>
          <input {...register('registrationNumber')} placeholder="GJ01AB452" className={inputCls(errors.registrationNumber)} style={{ textTransform: 'uppercase' }} />
        </FormField>
        <FormField label="Vehicle Name" error={errors.vehicleName?.message} required>
          <input {...register('vehicleName')} placeholder="VAN-05" className={inputCls(errors.vehicleName)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Model" error={errors.model?.message} required>
          <input {...register('model')} placeholder="Tata Ace" className={inputCls(errors.model)} />
        </FormField>
        <FormField label="Vehicle Type" error={errors.vehicleType?.message} required>
          <select {...register('vehicleType')} className={inputCls(errors.vehicleType)}>
            <option value="">Select type…</option>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Capacity (kg)" error={errors.capacity?.message} required>
          <input type="number" {...register('capacity')} placeholder="500" className={inputCls(errors.capacity)} />
        </FormField>
        <FormField label="Acquisition Cost (₹)" error={errors.acquisitionCost?.message} required>
          <input type="number" {...register('acquisitionCost')} placeholder="620000" className={inputCls(errors.acquisitionCost)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Odometer (km)" error={errors.odometer?.message}>
          <input type="number" {...register('odometer')} placeholder="0" className={inputCls(errors.odometer)} />
        </FormField>
        {isEdit && (
          <FormField label="Status" error={errors.status?.message}>
            <select {...register('status')} className={inputCls(errors.status)}>
              {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Btn type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Add Vehicle'}
        </Btn>
      </div>
    </form>
  );
};

const Fleet = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [deleteVehicle, setDeleteVehicle] = useState(null);

  const params = { page, limit: 10, ...(search && { search }), ...(typeFilter && { vehicleType: typeFilter }), ...(statusFilter && { status: statusFilter }) };

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehicleService.getAll(params),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: vehicleService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehicle added.'); setAddOpen(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add vehicle.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => vehicleService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehicle updated.'); setEditVehicle(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update vehicle.'),
  });

  const deleteMutation = useMutation({
    mutationFn: vehicleService.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehicle deleted.'); setDeleteVehicle(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete vehicle.'),
  });

  const vehicles = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="p-6">
      <PageHeader
        title="Fleet Registry"
        description="Manage all registered vehicles, status, and operational data."
        actions={
          <Btn onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Vehicle
          </Btn>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search reg. no, name…"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 transition"
          />
        </div>
        <div className="relative">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-amber-500">
            <option value="">Type: All</option>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-amber-500">
            <option value="">Status: All</option>
            {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
        {(search || typeFilter || statusFilter) && (
          <button onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setPage(1); }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
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
                {['Reg. No.', 'Name / Model', 'Type', 'Capacity', 'Odometer', 'Acq. Cost', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12"><LoadingPage /></td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState icon={Truck} title="No vehicles found" description="Add your first vehicle or adjust the filters." />
                </td></tr>
              ) : vehicles.map(v => (
                <tr key={v._id} className="hover:bg-slate-50/70 transition group">
                  <td className="px-4 py-3.5 font-mono font-semibold text-slate-900 text-xs">{v.registrationNumber}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900">{v.vehicleName}</div>
                    <div className="text-xs text-slate-400">{v.model}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{v.vehicleType}</td>
                  <td className="px-4 py-3.5 text-slate-600">{v.capacity?.toLocaleString()} kg</td>
                  <td className="px-4 py-3.5 text-slate-600">{v.odometer?.toLocaleString()} km</td>
                  <td className="px-4 py-3.5 text-slate-600">₹{v.acquisitionCost?.toLocaleString()}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setEditVehicle(v)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteVehicle(v)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div className="px-4">
            <Pagination {...pagination} onPage={setPage} />
          </div>
        )}
      </div>

      {/* Business Rule note */}
      <p className="mt-3 text-xs text-amber-600">
        Rule: Registration No. must be unique · Retired / In Shop vehicles are hidden from Trip Dispatcher
      </p>

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Vehicle" subtitle="Register a new vehicle to the fleet.">
        <VehicleForm onSubmit={createMutation.mutate} loading={createMutation.isPending} isEdit={false} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editVehicle} onClose={() => setEditVehicle(null)} title="Edit Vehicle" subtitle={editVehicle?.registrationNumber}>
        {editVehicle && (
          <VehicleForm
            defaultValues={editVehicle}
            onSubmit={(data) => updateMutation.mutate({ id: editVehicle._id, data })}
            loading={updateMutation.isPending}
            isEdit
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteVehicle}
        onClose={() => setDeleteVehicle(null)}
        onConfirm={() => deleteMutation.mutate(deleteVehicle._id)}
        loading={deleteMutation.isPending}
        title="Delete Vehicle"
        message={`Permanently delete ${deleteVehicle?.vehicleName} (${deleteVehicle?.registrationNumber})? This cannot be undone.`}
        confirmLabel="Delete Vehicle"
      />
    </div>
  );
};

export default Fleet;
