import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fuelService, expenseService, vehicleService, tripService, maintenanceService } from '../services/dataService';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_STYLE = {
  Available:  { bg: 'bg-green-500' },
  Completed:  { bg: 'bg-green-500' },
  'On Trip':  { bg: 'bg-blue-500' },
  Pending:    { bg: 'bg-amber-500' },
  Paid:       { bg: 'bg-green-500' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { bg: 'bg-gray-400' };
  return <span className={`inline-block px-3 py-1 text-xs font-semibold text-white rounded ${s.bg}`}>{status}</span>;
};

const FuelLogs = () => {
  const queryClient = useQueryClient();
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [fuelForm, setFuelForm] = useState({ vehicle: '', date: new Date().toISOString().slice(0, 10), liters: '', fuelPrice: '' });
  const [expenseForm, setExpenseForm] = useState({ trip: '', vehicle: '', toll: '', other: '', notes: '' });

  const { data: fuelResp, isLoading: fuelLoading } = useQuery({
    queryKey: ['fuel-logs'],
    queryFn: () => fuelService.getAll(),
  });

  const { data: expenseResp, isLoading: expenseLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expenseService.getAll(),
  });

  const { data: opCostResp } = useQuery({
    queryKey: ['expenses', 'operational-cost'],
    queryFn: () => expenseService.getOperationalCost(),
  });

  const { data: vehicleResp } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll(),
  });

  const { data: tripResp } = useQuery({
    queryKey: ['trips', 'all'],
    queryFn: () => tripService.getAll({ limit: 50 }),
  });

  const { data: maintenanceResp } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => maintenanceService.getAll(),
  });

  const fuelLogs       = fuelResp?.data || fuelResp || [];
  const expenses       = expenseResp?.data || expenseResp || [];
  const vehicles       = vehicleResp?.data || vehicleResp || [];
  const trips          = tripResp?.data || tripResp || [];
  const maintenanceList = maintenanceResp?.data || maintenanceResp || [];

  // Sum all maintenance costs and fuel costs to calculate Total Operational Cost (Auto)
  const totalMaintCost = maintenanceList.reduce((sum, m) => sum + (m.cost || 0), 0);
  const totalFuelCost  = fuelLogs.reduce((sum, f) => sum + (f.cost || 0), 0);
  const totalOpCost    = totalFuelCost + totalMaintCost;

  const handleTripChange = (tripId) => {
    const selectedTrip = trips.find(t => t._id === tripId);
    const vehicleId = selectedTrip?.vehicle?._id || selectedTrip?.vehicle || '';
    setExpenseForm(f => ({
      ...f,
      trip: tripId,
      vehicle: vehicleId,
    }));
  };

  const addFuelMutation = useMutation({
    mutationFn: fuelService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'operational-cost'] });
      toast.success('Fuel log added.');
      setShowFuelModal(false);
      setFuelForm({ vehicle: '', date: new Date().toISOString().slice(0, 10), liters: '', fuelPrice: '' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to log fuel.'),
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (payload) => {
      const promises = [];
      const tollVal = Number(payload.toll);
      const otherVal = Number(payload.other);
      
      if (tollVal > 0) {
        promises.push(expenseService.create({
          vehicle: payload.vehicle || undefined,
          trip: payload.trip || undefined,
          type: 'Toll',
          amount: tollVal,
          description: payload.notes || 'Toll cost',
        }));
      }
      if (otherVal > 0) {
        promises.push(expenseService.create({
          vehicle: payload.vehicle || undefined,
          trip: payload.trip || undefined,
          type: 'Misc',
          amount: otherVal,
          description: payload.notes || 'Misc cost',
        }));
      }
      if (promises.length === 0) {
        promises.push(expenseService.create({
          vehicle: payload.vehicle || undefined,
          trip: payload.trip || undefined,
          type: 'Misc',
          amount: 0,
          description: payload.notes || 'Zero expense record',
        }));
      }
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'operational-cost'] });
      toast.success('Expense added successfully.');
      setShowExpenseModal(false);
      setExpenseForm({ trip: '', vehicle: '', toll: '', other: '', notes: '' });
    },
    onError: (e) => {
      const details = e.response?.data?.errors;
      const msg = details ? details.map(err => `${err.field}: ${err.message}`).join(', ') : (e.response?.data?.message || 'Failed to add expense.');
      toast.error(msg);
    },
  });

  const handleFuelSubmit = (e) => {
    e.preventDefault();
    if (!fuelForm.vehicle) { toast.error('Select a vehicle.'); return; }
    addFuelMutation.mutate({
      vehicle: fuelForm.vehicle,
      date: fuelForm.date,
      liters: Number(fuelForm.liters),
      fuelPrice: Number(fuelForm.fuelPrice),
    });
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    addExpenseMutation.mutate({
      trip: expenseForm.trip || undefined,
      vehicle: expenseForm.vehicle || undefined,
      toll: expenseForm.toll ? Number(expenseForm.toll) : 0,
      other: expenseForm.other ? Number(expenseForm.other) : 0,
      notes: expenseForm.notes,
    });
  };



  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowFuelModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded transition hover:opacity-90"
          style={{ backgroundColor: '#f59e0b' }}
        >
          <Plus size={14} /> Log Fuel
        </button>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded transition hover:opacity-90"
          style={{ backgroundColor: '#f59e0b' }}
        >
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {/* FUEL LOGS section */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Fuel Logs</p>
        <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800">
                  {['Vehicle', 'Date', 'Liters', 'Fuel Cost'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {fuelLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 4 }).map((__, j) => <td key={j} className="px-5 py-3"><div className="h-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>)}</tr>
                    ))
                  : fuelLogs.length === 0
                  ? <tr><td colSpan={4} className="px-5 py-6 text-center text-gray-400 dark:text-slate-500 text-sm">No fuel logs</td></tr>
                  : fuelLogs.map(f => (
                      <tr key={f._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3 text-xs font-medium text-gray-800 dark:text-slate-200">{f.vehicle?.vehicleName || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{formatDate(f.date)}</td>
                        <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{f.liters != null ? `${f.liters} L` : '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{f.cost != null ? f.cost.toLocaleString('en-IN') : '—'}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* OTHER EXPENSES section */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Other Expenses (Toll / Misc)</p>
        <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800">
                  {['Trip', 'Vehicle', 'Toll', 'Other', 'Maint. (Linked)', 'Total', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {expenseLoading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-5 py-3"><div className="h-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>)}</tr>
                    ))
                  : expenses.length === 0
                  ? <tr><td colSpan={7} className="px-5 py-6 text-center text-gray-400 dark:text-slate-500 text-sm">No expenses</td></tr>
                  : expenses.map(ex => {
                      const vehicleId = ex.vehicle?._id || ex.vehicle;
                      const maintAmt = maintenanceList
                        .filter(m => String(m.vehicle?._id || m.vehicle) === String(vehicleId))
                        .reduce((sum, m) => sum + (m.cost || 0), 0);

                      const toll = ex.type === 'Toll' ? (ex.amount || 0) : 0;
                      const other = (ex.type === 'Misc' || ex.type === 'Parking') ? (ex.amount || 0) : 0;
                      const total = toll + other + maintAmt;

                      const tripId = ex.trip?._id || ex.trip;
                      const matchedTrip = trips.find(t => t._id === tripId) || trips.find(t => String(t.vehicle?._id || t.vehicle) === String(vehicleId));
                      const displayTripCode = ex.trip?.tripCode || matchedTrip?.tripCode || '—';

                      let expenseStatus = 'Available';
                      if (matchedTrip) {
                        if (matchedTrip.status === 'Dispatched') expenseStatus = 'On Trip';
                        else if (matchedTrip.status === 'Completed') expenseStatus = 'Completed';
                        else if (matchedTrip.status === 'Cancelled') expenseStatus = 'Cancelled';
                        else if (matchedTrip.status === 'Draft') expenseStatus = 'Draft';
                      }

                      return (
                        <tr key={ex._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition">
                          <td className="px-5 py-3 text-xs font-mono text-gray-700 dark:text-slate-300">{displayTripCode}</td>
                          <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{ex.vehicle?.vehicleName || '—'}</td>
                          <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">₹{toll.toLocaleString('en-IN')}</td>
                          <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">₹{other.toLocaleString('en-IN')}</td>
                          <td className="px-5 py-3 text-xs text-gray-700 dark:text-slate-300">{maintAmt ? `₹${maintAmt.toLocaleString('en-IN')}` : 0}</td>
                          <td className="px-5 py-3 text-xs font-medium text-gray-800 dark:text-slate-200">₹{total.toLocaleString('en-IN')}</td>
                          <td className="px-5 py-3"><StatusBadge status={expenseStatus} /></td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Total Operational Cost */}
      <div className="flex items-center border-t border-gray-200 dark:border-slate-800 pt-4">
        <span className="text-sm text-gray-600 dark:text-slate-400">Total Operational Cost (Auto) = Fuel + Maint</span>
        <span className="ml-auto text-lg font-bold" style={{ color: '#f59e0b' }}>
          {totalOpCost != null
            ? totalOpCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })
            : totalFuelCost
            ? totalFuelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })
            : '—'}
        </span>
      </div>

      {/* LOG FUEL MODAL */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200">Log Fuel</h3>
              <button onClick={() => setShowFuelModal(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"><X size={18} /></button>
            </div>
            <form onSubmit={handleFuelSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Vehicle</label>
                <select value={fuelForm.vehicle} onChange={e => setFuelForm(f => ({ ...f, vehicle: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" required>
                  <option value="" className="dark:bg-slate-900">Select vehicle...</option>
                  {vehicles.map(v => <option key={v._id} value={v._id} className="dark:bg-slate-900">{v.vehicleName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Date</label>
                <input type="date" value={fuelForm.date} onChange={e => setFuelForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Liters</label>
                  <input type="number" placeholder="42" value={fuelForm.liters} onChange={e => setFuelForm(f => ({ ...f, liters: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Price Per Liter (₹)</label>
                  <input type="number" placeholder="95" value={fuelForm.fuelPrice} onChange={e => setFuelForm(f => ({ ...f, fuelPrice: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowFuelModal(false)} className="flex-1 py-2 text-sm border border-gray-300 dark:border-slate-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={addFuelMutation.isPending}
                  className="flex-1 py-2 text-sm font-semibold text-white rounded disabled:opacity-60"
                  style={{ backgroundColor: '#f59e0b' }}>
                  {addFuelMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200">Add Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"><X size={18} /></button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Trip</label>
                <select value={expenseForm.trip} onChange={e => handleTripChange(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                  <option value="" className="dark:bg-slate-900">Select trip...</option>
                  {trips.map(t => <option key={t._id} value={t._id} className="dark:bg-slate-900">{t.tripCode}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Vehicle</label>
                <select value={expenseForm.vehicle} onChange={e => setExpenseForm(f => ({ ...f, vehicle: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                  <option value="" className="dark:bg-slate-900">Select vehicle...</option>
                  {vehicles.map(v => <option key={v._id} value={v._id} className="dark:bg-slate-900">{v.vehicleName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Toll (₹)</label>
                  <input type="number" placeholder="120" value={expenseForm.toll} onChange={e => setExpenseForm(f => ({ ...f, toll: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Other (₹)</label>
                  <input type="number" placeholder="0" value={expenseForm.other} onChange={e => setExpenseForm(f => ({ ...f, other: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Notes</label>
                <input placeholder="Toll, misc..." value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 py-2 text-sm border border-gray-300 dark:border-slate-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={addExpenseMutation.isPending}
                  className="flex-1 py-2 text-sm font-semibold text-white rounded disabled:opacity-60"
                  style={{ backgroundColor: '#f59e0b' }}>
                  {addExpenseMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelLogs;
