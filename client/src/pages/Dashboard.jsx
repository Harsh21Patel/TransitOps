import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { useSocketListener } from '../hooks/useSocketListener';
import { RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  Dispatched: { bg: 'bg-blue-500', label: 'On Trip' },
  'On Trip':  { bg: 'bg-blue-500', label: 'On Trip' },
  Completed:  { bg: 'bg-green-500', label: 'Completed' },
  Draft:      { bg: 'bg-gray-400', label: 'Draft' },
  Cancelled:  { bg: 'bg-red-500', label: 'Cancelled' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_BADGE[status] || { bg: 'bg-gray-400', label: status };
  return (
    <span className={`inline-block px-3 py-1 rounded text-white text-xs font-semibold ${s.bg}`}>
      {s.label}
    </span>
  );
};

const KpiCard = ({ label, value, borderColor }) => (
  <div className="bg-white dark:bg-slate-900 rounded border border-gray-100 dark:border-slate-800 border-t-4 p-4 min-w-0" style={{ borderTopColor: borderColor }}>
    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide leading-tight">{label}</p>
    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-2">{value ?? '—'}</p>
  </div>
);

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Trip');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: kpis, isLoading: kpisLoading, isError: kpisError, refetch: refetchKpis } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: dashboardService.getKpis,
  });

  const { data: widgets, isLoading: widgetsLoading, isError: widgetsError, refetch: refetchWidgets } = useQuery({
    queryKey: ['dashboard', 'widgets'],
    queryFn: dashboardService.getWidgets,
  });

  const { data: charts, refetch: refetchCharts } = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: dashboardService.getCharts,
  });

  useSocketListener('trip:created', () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }));
  useSocketListener('trip:dispatched', () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }));
  useSocketListener('trip:completed', () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }));
  useSocketListener('trip:cancelled', () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchKpis(), refetchWidgets(), refetchCharts()]);
      toast.success('Dashboard refreshed.');
    } catch { toast.error('Failed to refresh.'); }
    finally { setIsRefreshing(false); }
  };

  const getETA = (trip) => {
    if (trip.status === 'Completed') return 'Completed';
    if (trip.status === 'Cancelled') return 'Cancelled';
    if (trip.status === 'Draft') return 'Awaiting dispatch';
    if (trip.status === 'Dispatched' && trip.dispatchedAt && trip.distance) {
      const speedKmh = 50; // average truck speed
      const travelTimeHours = trip.distance / speedKmh;
      const dispatchedTime = new Date(trip.dispatchedAt).getTime();
      const etaTime = new Date(dispatchedTime + travelTimeHours * 3600 * 1000);
      return etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '—';
  };

  const getFilteredTrips = () => {
    if (!widgets?.recentTrips) return [];
    let trips = [...widgets.recentTrips];
    if (statusFilter !== 'All') trips = trips.filter(t => t.status === statusFilter);
    if (vehicleTypeFilter !== 'All') trips = trips.filter(t => t.vehicle?.vehicleType === vehicleTypeFilter);
    return trips;
  };

  const getSortedTrips = (tripsList) => {
    const sorted = [...tripsList];
    if (sortBy === 'Trip') {
      sorted.sort((a, b) => (a.tripCode || '').localeCompare(b.tripCode || ''));
    } else if (sortBy === 'Status') {
      sorted.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    } else if (sortBy === 'ETA') {
      sorted.sort((a, b) => {
        const etaA = getETA(a);
        const etaB = getETA(b);
        return etaA.localeCompare(etaB);
      });
    }
    return sorted;
  };

  const KANBAN_COLUMNS = [
    { key: 'Draft',      label: 'Draft',      color: 'bg-gray-100 dark:bg-slate-800/60 text-gray-800 dark:text-slate-350 border-gray-300 dark:border-slate-700', bgCard: 'border-l-gray-400' },
    { key: 'Dispatched', label: 'On Trip',    color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',  bgCard: 'border-l-blue-500' },
    { key: 'Completed',  label: 'Completed',  color: 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/50', bgCard: 'border-l-green-500' },
    { key: 'Cancelled',  label: 'Cancelled',  color: 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50',      bgCard: 'border-l-red-500' },
  ];

  const getTripsForColumn = (colKey) => {
    if (statusFilter !== 'All' && statusFilter !== colKey) return [];
    let list = widgets?.recentTrips || [];
    if (vehicleTypeFilter !== 'All') {
      list = list.filter(t => t.vehicle?.vehicleType === vehicleTypeFilter);
    }
    return list.filter(t => t.status === colKey);
  };

  // Vehicle Status bar data
  const vehicleStatuses = [
    { label: 'Available', color: '#22c55e' },
    { label: 'On Trip',   color: '#3b82f6' },
    { label: 'In Shop',   color: '#f59e0b' },
    { label: 'Retired',   color: '#ef4444' },
  ];

  const totalVehicles = widgets?.vehicleStatus?.reduce((a, c) => a + c.count, 0) || 1;

  const getCount = (status) => {
    const found = widgets?.vehicleStatus?.find(v => v.status === status || v._id === status);
    return found ? found.count : 0;
  };

  if (kpisError || widgetsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-gray-700 dark:text-slate-200 font-medium">Failed to load dashboard</p>
        <button onClick={handleRefresh} className="mt-3 text-sm px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition">
          Retry
        </button>
      </div>
    );
  }

  const isLoading = kpisLoading || widgetsLoading;

  return (
    <div className="space-y-5">
      {/* FILTERS row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Filters</span>
        <select
          value={vehicleTypeFilter}
          onChange={e => setVehicleTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          <option value="All">Vehicle Type: All</option>
          {['Van', 'Truck', 'Bus', 'Pickup', 'Trailer', 'Refrigerated Truck', 'Motorcycle'].map(v => (
            <option key={v} value={v}>{`Vehicle Type: ${v}`}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          <option value="All">Status: All</option>
          {['Draft', 'Dispatched', 'Completed', 'Cancelled'].map(v => (
            <option key={v} value={v}>{`Status: ${v}`}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="text-sm border border-gray-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          <option value="Trip">Sort by: Trip</option>
          <option value="Status">Sort by: Status</option>
          <option value="ETA">Sort by: ETA</option>
        </select>
        <button
          onClick={handleRefresh}
          className="ml-auto p-1.5 text-gray-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-500 transition"
          title="Refresh"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI STATS BAR */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white rounded border-t-4 border-gray-200 p-4 animate-pulse">
              <div className="h-2 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiCard label="Active Vehicles" value={kpis?.activeVehicles} borderColor="#22c55e" />
          <KpiCard label="Available Vehicles" value={kpis?.availableVehicles} borderColor="#22c55e" />
          <KpiCard label="Vehicles in Maintenance" value={kpis?.vehiclesInMaintenance} borderColor="#f59e0b" />
          <KpiCard label="Active Trips" value={kpis?.activeTrips} borderColor="#3b82f6" />
          <KpiCard label="Pending Trips" value={kpis?.pendingTrips} borderColor="#3b82f6" />
          <KpiCard label="Drivers on Duty" value={kpis?.driversOnDuty} borderColor="#8b5cf6" />
          <KpiCard label="Fleet Utilization" value={kpis?.fleetUtilization ? `${kpis.fleetUtilization}%` : '—'} borderColor="#22c55e" />
        </div>
      )}
      {/* BOTTOM SECTION — Recent Trips + Vehicle Status */}
      <div className="flex gap-5 flex-wrap lg:flex-nowrap">
        {/* Recent Trips table */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 overflow-hidden min-w-0">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Recent Trips</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Trip</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Vehicle</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Driver</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-5 py-3">
                            <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : getFilteredTrips().length === 0
                  ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-gray-400 dark:text-slate-500 text-sm">No trips found</td>
                      </tr>
                    )
                  : getSortedTrips(getFilteredTrips()).map((trip) => (
                      <tr key={trip._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3 text-xs font-mono text-gray-700 dark:text-slate-300">{trip.tripCode}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-slate-200">{trip.vehicle?.vehicleName || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-slate-200">{trip.driver?.name?.split(' ')[0] || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={trip.status} /></td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-300 font-medium">
                          {getETA(trip)}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Status panel */}
        <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 p-5" style={{ minWidth: '220px', width: '240px' }}>
          <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">Vehicle Status</h3>
          <div className="space-y-3">
            {vehicleStatuses.map(({ label, color }) => {
              const count = getCount(label);
              const pct = Math.round((count / totalVehicles) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-650 dark:text-slate-300">{label}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{count}</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 p-5 mt-5">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Trips Kanban Board</h3>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">Total Filtered: {getFilteredTrips().length}</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(col => {
            const colTrips = getSortedTrips(getTripsForColumn(col.key));
            return (
              <div key={col.key} className="flex-1 min-w-[250px] bg-slate-50/40 dark:bg-slate-950/20 rounded border border-gray-100 dark:border-slate-800/80 p-3 flex flex-col">
                <div className={`flex items-center justify-between mb-3 px-2.5 py-1.5 rounded border text-xs font-bold uppercase tracking-wider dark:bg-slate-900 dark:border-slate-800 ${col.color}`}>
                  <span>{col.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 shadow-xs border dark:border-slate-700 text-[10px] text-gray-700 dark:text-slate-300">{colTrips.length}</span>
                </div>
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[350px] pr-1">
                  {colTrips.length === 0 ? (
                    <div className="h-16 flex items-center justify-center border border-dashed border-gray-200 dark:border-slate-800 rounded text-xs text-gray-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50">
                      No trips
                    </div>
                  ) : (
                    colTrips.map(trip => (
                      <div key={trip._id} className={`bg-white dark:bg-slate-800 rounded p-3 border border-gray-200 dark:border-slate-700 shadow-xs border-l-4 ${col.bgCard} hover:shadow-sm transition`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-mono font-bold text-gray-700 dark:text-slate-300">{trip.tripCode}</span>
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">{getETA(trip)}</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate mb-1">
                          {trip.source} ➔ {trip.destination}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500 dark:text-slate-400 border-t border-gray-50 dark:border-slate-800 pt-1.5 mt-1">
                          <div>
                            <span className="block text-[8px] uppercase font-bold text-gray-400 dark:text-slate-500">Vehicle</span>
                            <span className="font-semibold text-gray-700 dark:text-slate-300 truncate block">{trip.vehicle?.vehicleName || '—'}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase font-bold text-gray-400 dark:text-slate-500">Driver</span>
                            <span className="font-semibold text-gray-700 dark:text-slate-300 truncate block">{trip.driver?.name || '—'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
