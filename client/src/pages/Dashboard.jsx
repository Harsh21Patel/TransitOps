import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboardService } from '../services/dashboardService';
import { useSocketListener } from '../hooks/useSocketListener';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { 
  Truck, 
  Compass, 
  Users, 
  Wrench, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Eye,
  MapPin,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

// Chart Colors
const PIE_COLORS = {
  Dispatched: '#3b82f6', // blue
  Completed: '#10b981',  // green
  Draft: '#94a3b8',      // gray-slate
  Cancelled: '#f43f5e',  // rose-red
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  
  // Local UI filters state
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');

  // Selected trip for drawer detail view
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Manual refresh loading indicator
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Operations logs state
  const [liveLogs, setLiveLogs] = useState([]);

  // React Query calls to dashboard endpoints
  const { 
    data: kpis, 
    isLoading: kpisLoading, 
    isError: kpisError,
    refetch: refetchKpis
  } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: dashboardService.getKpis,
  });

  const { 
    data: widgets, 
    isLoading: widgetsLoading, 
    isError: widgetsError,
    refetch: refetchWidgets
  } = useQuery({
    queryKey: ['dashboard', 'widgets'],
    queryFn: dashboardService.getWidgets,
  });

  const { 
    data: charts, 
    isLoading: chartsLoading, 
    isError: chartsError,
    refetch: refetchCharts
  } = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: dashboardService.getCharts,
  });

  // Listen to Socket.IO events on the client page to show a scrolling Operations Feed
  const registerLiveLog = (message, statusColor) => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date(),
      message,
      statusColor,
    };
    setLiveLogs((prev) => [newLog, ...prev].slice(0, 15)); // keep last 15 items
  };

  useSocketListener('trip:created', (trip) => {
    registerLiveLog(`Draft trip ${trip.tripCode} created for ${trip.source} → ${trip.destination}`, 'bg-slate-400');
  });

  useSocketListener('trip:dispatched', (trip) => {
    registerLiveLog(`Trip ${trip.tripCode} dispatched with vehicle ${trip.vehicle?.vehicleName || 'unassigned'}`, 'bg-blue-500');
  });

  useSocketListener('trip:completed', (trip) => {
    registerLiveLog(`Trip ${trip.tripCode} successfully completed at ${trip.destination}`, 'bg-emerald-500');
  });

  useSocketListener('trip:cancelled', (trip) => {
    registerLiveLog(`Trip ${trip.tripCode} cancelled: ${trip.cancellationReason || 'No reason specified'}`, 'bg-rose-500');
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchKpis(),
        refetchWidgets(),
        refetchCharts()
      ]);
      toast.success('Dashboard metrics refreshed.');
    } catch (err) {
      toast.error('Failed to refresh data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter handlers for Recent Trips table based on UI selection
  const getFilteredTrips = () => {
    if (!widgets?.recentTrips) return [];
    let trips = [...widgets.recentTrips];

    if (vehicleTypeFilter !== 'All') {
      trips = trips.filter(t => t.vehicle?.vehicleType === vehicleTypeFilter);
    }
    if (statusFilter !== 'All') {
      trips = trips.filter(t => t.status === statusFilter);
    }
    // Note: Region filter is placeholder / simulation
    if (regionFilter !== 'All') {
      // Simulate region filtering by destination match
      trips = trips.filter(t => t.destination.toLowerCase().includes(regionFilter.toLowerCase()));
    }

    return trips;
  };

  const filteredRecentTrips = getFilteredTrips();

  // Loading/Error states
  const isGlobalLoading = kpisLoading || widgetsLoading || chartsLoading;
  const isGlobalError = kpisError || widgetsError || chartsError;

  if (isGlobalError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <AlertCircle className="h-14 w-14 text-rose-500 mb-4 stroke-[1.5]" />
        <h2 className="text-xl font-bold text-slate-900">Failed to load dashboard metrics</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          There was an error communicating with the TransitOps database or API server. Ensure the server is online.
        </p>
        <button
          onClick={handleManualRefresh}
          className="mt-5 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4.5 py-2 rounded-lg transition"
        >
          <RefreshCw size={16} />
          Retry Connection
        </button>
      </div>
    );
  }

  // Calculate dynamic progress bars details for Vehicle Status list
  const getStatusProgress = () => {
    if (!widgets?.vehicleStatus) return [];
    
    // Status keys we expect
    const statuses = ['Available', 'On Trip', 'In Shop', 'Retired'];
    const totalVehicles = widgets.vehicleStatus.reduce((acc, curr) => acc + curr.count, 0) || 1;

    return statuses.map(status => {
      const found = widgets.vehicleStatus.find(v => v.status === status);
      const count = found ? found.count : 0;
      const percentage = Math.round((count / totalVehicles) * 100);
      
      let colorClass = 'bg-slate-400';
      if (status === 'Available') colorClass = 'bg-emerald-500';
      if (status === 'On Trip') colorClass = 'bg-blue-500';
      if (status === 'In Shop') colorClass = 'bg-amber-500';
      if (status === 'Retired') colorClass = 'bg-rose-500';

      return { status, count, percentage, colorClass };
    });
  };

  const vehicleStatusProgress = getStatusProgress();

  // Prepare trip status distribution pie data
  const getPieChartData = () => {
    if (!charts?.tripsByStatus) return [];
    return charts.tripsByStatus.map(t => ({
      name: t.status,
      value: t.count
    }));
  };

  const pieChartData = getPieChartData();
  const totalTripsCount = pieChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Formatting utility for currency (INR)
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* --- DASHBOARD HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time command center monitoring fleet status and dispatch logs.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden lg:inline flex-shrink-0">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isGlobalLoading}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={`${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </div>
      </div>

      {/* --- FILTERS SECTION --- */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col gap-3">
        <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Quick Filters</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-xs font-medium text-slate-500 mb-1">Vehicle Type</label>
            <select
              value={vehicleTypeFilter}
              onChange={(e) => setVehicleTypeFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Truck">Trucks</option>
              <option value="Van">Vans</option>
              <option value="Bus">Buses</option>
              <option value="Pickup">Pickups</option>
              <option value="Refrigerated Truck">Refrigerated</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 bottom-3 pointer-events-none text-slate-400" />
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-slate-500 mb-1">Trip Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 bottom-3 pointer-events-none text-slate-400" />
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-slate-500 mb-1">Depot / Destination</label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
            >
              <option value="All">All Regions</option>
              <option value="Ahmedabad">Ahmedabad Hub</option>
              <option value="Gandhinagar">Gandhinagar Depot</option>
              <option value="Warehouse">Warehouses</option>
              <option value="Depot">Depots</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 bottom-3 pointer-events-none text-slate-400" />
          </div>
        </div>
      </div>

      {/* --- KPI CARDS GRID --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Card 1: Active Vehicles */}
        <div className="bg-white border-l-4 border-l-blue-500 border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider uppercase">Active Vehicles</span>
            <Truck size={16} />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isGlobalLoading ? '...' : kpis?.activeVehicles}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              / {kpis?.totalVehicles} total
            </span>
          </div>
        </div>

        {/* Card 2: Available Vehicles */}
        <div className="bg-white border-l-4 border-l-emerald-500 border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider uppercase">Available Vehicles</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isGlobalLoading ? '...' : kpis?.availableVehicles}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Ready</span>
          </div>
        </div>

        {/* Card 3: Vehicles in Maintenance */}
        <div className="bg-white border-l-4 border-l-amber-500 border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider uppercase">In Maintenance</span>
            <Wrench size={16} className="text-amber-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isGlobalLoading ? '...' : String(kpis?.vehiclesInMaintenance).padStart(2, '0')}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">In Shop</span>
          </div>
        </div>

        {/* Card 4: Active Trips */}
        <div className="bg-white border-l-4 border-l-blue-600 border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider uppercase">Active Trips</span>
            <Compass size={16} className="text-blue-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isGlobalLoading ? '...' : kpis?.activeTrips}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Transit</span>
          </div>
        </div>

        {/* Card 5: Pending Trips */}
        <div className="bg-white border-l-4 border-l-slate-400 border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider uppercase">Pending Trips</span>
            <Clock size={16} />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isGlobalLoading ? '...' : String(kpis?.pendingTrips).padStart(2, '0')}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Drafts</span>
          </div>
        </div>

        {/* Card 6: Drivers On Duty */}
        <div className="bg-white border-l-4 border-l-indigo-500 border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider uppercase">Drivers On Duty</span>
            <Users size={16} />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isGlobalLoading ? '...' : kpis?.driversOnDuty}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              / {kpis?.totalDrivers} active
            </span>
          </div>
        </div>

        {/* Card 7: Fleet Utilization */}
        <div className="bg-white border-l-4 border-l-emerald-600 border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider uppercase">Fleet Utilization</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isGlobalLoading ? '...' : `${kpis?.fleetUtilization}%`}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Target 85%</span>
          </div>
        </div>
      </div>

      {/* --- CHARTS GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operational Costs (Area Chart) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Operational Cost Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">Fuel logs cost vs. Maintenance logs cost over the last 6 months</p>
            </div>
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <Calendar size={13} />
              Monthly
            </span>
          </div>

          <div className="h-72">
            {isGlobalLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-lg">
                <Clock className="animate-spin text-slate-300 mr-2" />
                <span className="text-slate-400 text-xs">Generating costs data...</span>
              </div>
            ) : charts?.operationalCostSeries?.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <p className="text-xs text-slate-400">No operational cost records found.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={charts?.operationalCostSeries}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMaint" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    labelStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}
                    itemStyle={{ fontSize: '12px', padding: '1px 0' }}
                    formatter={(v) => [formatCurrency(v), '']}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                  <Area 
                    name="Fuel Expense" 
                    type="monotone" 
                    dataKey="fuel" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorFuel)" 
                  />
                  <Area 
                    name="Maintenance Costs" 
                    type="monotone" 
                    dataKey="maintenance" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorMaint)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Trip Status distribution (Donut Chart) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Trip Status Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Ratio of trip completions and dispatch lifecycles</p>
            </div>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {isGlobalLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-slate-400 text-xs">Generating statuses...</span>
              </div>
            ) : pieChartData.length === 0 ? (
              <p className="text-xs text-slate-400">No active trip statistics.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || '#cbd5e1'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ fontSize: '11px', padding: '1px' }}
                      formatter={(v) => [v, 'Trips']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center total text */}
                <div className="absolute text-center">
                  <span className="text-2xl font-extrabold text-slate-800">{totalTripsCount}</span>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Total Trips</p>
                </div>
              </>
            )}
          </div>

          {/* Detailed legend */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 border-t border-slate-100 pt-4">
            {pieChartData.map((item) => {
              const color = PIE_COLORS[item.name] || '#cbd5e1';
              const percent = totalTripsCount > 0 ? Math.round((item.value / totalTripsCount) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center gap-2 px-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 truncate">{item.name}</p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.value} ({percent}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- LIVE WIDGETS GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips Table (2/3 width) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Trips Logs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Live status and ETA of recent active/draft dispatches</p>
            </div>
            <span className="inline-flex items-center px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 rounded-md">
              Real-time
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-2.5 font-semibold">Trip</th>
                  <th className="pb-2.5 font-semibold">Vehicle</th>
                  <th className="pb-2.5 font-semibold">Driver</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold text-right">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {isGlobalLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      Loading recent dispatches...
                    </td>
                  </tr>
                ) : filteredRecentTrips.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No matching trips found. Adjust filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecentTrips.map((trip) => {
                    let statusBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                    if (trip.status === 'Dispatched') statusBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                    if (trip.status === 'Completed') statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    if (trip.status === 'Cancelled') statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';

                    // Mock ETA values if dispatched, or draft awaiting details
                    let etaText = '-';
                    if (trip.status === 'Dispatched') {
                      etaText = trip.distance > 100 ? '4h 15m' : '45 min';
                    } else if (trip.status === 'Draft') {
                      etaText = 'Awaiting Vehicle';
                    }

                    return (
                      <tr 
                        key={trip._id} 
                        onClick={() => setSelectedTrip(trip)}
                        className="hover:bg-slate-50/70 transition cursor-pointer group"
                      >
                        <td className="py-3 font-semibold text-slate-900 group-hover:text-amber-600 transition flex items-center gap-1.5">
                          <Eye size={12} className="opacity-0 group-hover:opacity-100 text-amber-500 transition" />
                          {trip.tripCode}
                        </td>
                        <td className="py-3 font-medium text-slate-600">
                          {trip.vehicle ? trip.vehicle.vehicleName : '-'}
                        </td>
                        <td className="py-3 font-medium text-slate-600">
                          {trip.driver ? trip.driver.name : '-'}
                        </td>
                        <td className="py-3">
                          <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${statusBadge}`}>
                            {trip.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-medium text-slate-500">
                          {etaText}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Sidebar Stats (1/3 width): Status counts and Live log feed */}
        <div className="space-y-6">
          {/* Vehicle Status widget */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Vehicle Fleet Status
            </h3>
            
            <div className="space-y-3.5">
              {isGlobalLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading progress...</div>
              ) : vehicleStatusProgress.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No status distributions</div>
              ) : (
                vehicleStatusProgress.map((item) => (
                  <div key={item.status} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.status}</span>
                      <span className="font-medium text-slate-400">{item.count} vehicles ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${item.colorClass}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Operations Feed logs */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col max-h-[350px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4.5">
              <h3 className="text-sm font-semibold text-slate-900">Live Activity Log</h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {liveLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center">
                  <Clock size={24} className="text-slate-200 mb-2" />
                  Waiting for live events...
                </div>
              ) : (
                liveLogs.map((log) => (
                  <div key={log.id} className="text-xs leading-normal flex gap-2.5 items-start">
                    <span className={`h-1.5 w-1.5 mt-1.5 rounded-full flex-shrink-0 ${log.statusColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-600 font-medium">{log.message}</p>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">
                        {log.time.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- CHART ROW 2: MONTHLY TRIP VOLUME --- */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Monthly Trip Volume</h3>
            <p className="text-xs text-slate-500 mt-0.5">Historical overview of dispatched and fulfilled transport jobs</p>
          </div>
        </div>

        <div className="h-64">
          {isGlobalLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-slate-400 text-xs">Generating monthly volume bar charts...</span>
            </div>
          ) : charts?.monthlyTrips?.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-xs text-slate-400">No monthly logs found.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts?.monthlyTrips}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ fontSize: '11px' }}
                  formatter={(v) => [v, 'Completed Trips']}
                />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* --- DETAILED SLIDE-OUT DRAWER / MODAL --- */}
      <AnimatePresence>
        {selectedTrip && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={() => setSelectedTrip(null)} />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10"
            >
              {/* Drawer Header */}
              <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 bg-slate-50">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trip Information</span>
                  <h2 className="text-lg font-bold text-slate-800 mt-0.5">{selectedTrip.tripCode}</h2>
                </div>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Route Section */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <div className="w-0.5 h-6 bg-slate-300 border-dashed" />
                      <div className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                    </div>
                    <div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Source</span>
                        <p className="text-sm font-semibold text-slate-800">{selectedTrip.source}</p>
                      </div>
                      <div className="mt-3">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Destination</span>
                        <p className="text-sm font-semibold text-slate-800">{selectedTrip.destination}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border bg-blue-50 border-blue-200 text-blue-700">
                      {selectedTrip.status}
                    </span>
                    <p className="text-xs font-medium text-slate-400 mt-2">{selectedTrip.distance} km</p>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Operational Metrics
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-400">Cargo Weight</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedTrip.cargoWeight} kg</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Route Distance</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedTrip.distance} km</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                {selectedTrip.vehicle && (
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                      Assigned Vehicle
                    </h4>
                    <div className="flex items-center gap-3.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                        <Truck size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{selectedTrip.vehicle.vehicleName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedTrip.vehicle.vehicleType} • Cap: {selectedTrip.vehicle.capacity} kg
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {selectedTrip.vehicle.registrationNumber}
                      </span>
                    </div>
                  </div>
                )}

                {/* Driver Details */}
                {selectedTrip.driver && (
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                      Assigned Driver
                    </h4>
                    <div className="flex items-center gap-3.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                        <Users size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{selectedTrip.driver.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Lic: {selectedTrip.driver.licenseNumber} • Exp: {new Date(selectedTrip.driver.licenseExpiry).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Logs / Timestamps */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Operations Log
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Created:</span>
                      <span className="font-semibold text-slate-700">
                        {new Date(selectedTrip.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedTrip.dispatchedAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dispatched:</span>
                        <span className="font-semibold text-slate-700">
                          {new Date(selectedTrip.dispatchedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedTrip.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Completed:</span>
                        <span className="font-semibold text-slate-700">
                          {new Date(selectedTrip.completedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedTrip.cancelledAt && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-rose-600 font-semibold">
                          <span>Cancelled:</span>
                          <span>{new Date(selectedTrip.cancelledAt).toLocaleString()}</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-lg text-[11px] leading-relaxed">
                          <strong>Reason:</strong> {selectedTrip.cancellationReason || 'No reason specified'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="h-16 border-t border-slate-200 bg-slate-50 px-6 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">TransitOps Operational Record</span>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4.5 py-1.5 rounded-lg text-sm transition"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
