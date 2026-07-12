import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import CountUp from 'react-countup';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Truck, Fuel, Wrench, TrendingUp, TrendingDown,
  Activity, DollarSign, Zap, BarChart2, PieChart as PieIcon,
  Download, FileText, RefreshCw, AlertCircle,
} from 'lucide-react';
import { reportService, expenseService } from '../services/dataService';
import { dashboardService } from '../services/dashboardService';
import toast from 'react-hot-toast';

// ─── Palette ────────────────────────────────────────────────────────────────
const PALETTE = {
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  green:   '#22c55e',
  purple:  '#8b5cf6',
  red:     '#ef4444',
  cyan:    '#06b6d4',
  pink:    '#ec4899',
  orange:  '#f97316',
  teal:    '#14b8a6',
  indigo:  '#6366f1',
};

const STATUS_COLORS = {
  Available:   PALETTE.green,
  'On Trip':   PALETTE.blue,
  'In Shop':   PALETTE.amber,
  Retired:     '#6b7280',
};

const PIE_COLORS = [PALETTE.blue, PALETTE.green, PALETTE.amber, PALETTE.purple, PALETTE.red, PALETTE.cyan];

// ─── Shared chart theme helper ───────────────────────────────────────────────
const useChartTheme = (isDark) => ({
  axisColor: isDark ? '#475569' : '#d1d5db',
  tickColor: isDark ? '#94a3b8' : '#6b7280',
  gridColor: isDark ? '#1e293b' : '#f1f5f9',
  tooltipBg: isDark ? '#0f172a' : '#ffffff',
  tooltipBorder: isDark ? '#1e293b' : '#e5e7eb',
  tooltipText: isDark ? '#f1f5f9' : '#111827',
});

// ─── Skeleton ────────────────────────────────────────────────────────────────
const Skeleton = ({ h = 'h-40', className = '' }) => (
  <div className={`${h} bg-gray-100 dark:bg-slate-800 rounded animate-pulse ${className}`} />
);

// ─── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="h-8 w-8 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-500 flex-shrink-0">
      <Icon size={16} />
    </div>
    <div>
      <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wide">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─── Panel wrapper ───────────────────────────────────────────────────────────
const Panel = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-5 ${className}`}>
    {children}
  </div>
);

const PanelTitle = ({ children }) => (
  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">{children}</p>
);

// ─── Trend badge ─────────────────────────────────────────────────────────────
const Trend = ({ value, suffix = '%' }) => {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${up ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'}`}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? '+' : ''}{value}{suffix}
    </span>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, prefix = '', suffix = '', decimals = 0, color, note, trend, raw }) => (
  <Panel className="flex flex-col gap-1 border-t-2" style={{ borderTopColor: color }}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="h-7 w-7 rounded flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
        <Icon size={14} />
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 leading-none">
      {prefix}
      {raw != null ? (
        <CountUp end={raw} decimals={decimals} separator="," duration={1.4} useEasing />
      ) : '—'}
      {suffix}
    </div>
    <div className="flex items-center gap-2 mt-1">
      {trend != null && <Trend value={trend} />}
      {note && <span className="text-[10px] text-gray-400 dark:text-slate-500 leading-tight">{note}</span>}
    </div>
  </Panel>
);

// ─── Custom tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, formatter, isDark }) => {
  const ct = useChartTheme(isDark);
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
      {label && <p className="font-semibold mb-1" style={{ color: ct.tooltipText }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatter ? formatter(p.value) : p.value}</p>
      ))}
    </div>
  );
};

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState = ({ message = 'No data available' }) => (
  <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-slate-600 gap-2">
    <AlertCircle size={28} />
    <p className="text-sm">{message}</p>
  </div>
);

// ─── Donut chart with legend ─────────────────────────────────────────────────
const DonutChart = ({ data, colorMap, isDark, formatter = (v) => v }) => {
  const ct = useChartTheme(isDark);
  const total = data.reduce((s, d) => s + (d.value || d.count || 0), 0);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={i} fill={colorMap ? (colorMap[entry.name] || PIE_COLORS[i % PIE_COLORS.length]) : PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip isDark={isDark} formatter={formatter} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 flex-1">
        {data.map((entry, i) => {
          const color = colorMap ? (colorMap[entry.name] || PIE_COLORS[i % PIE_COLORS.length]) : PIE_COLORS[i % PIE_COLORS.length];
          const val = entry.value || entry.count || 0;
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600 dark:text-slate-400 flex-1">{entry.name}</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{formatter(val)}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 w-8 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Horizontal bar ranking ──────────────────────────────────────────────────
const HBarRanking = ({ data, keyLabel, keyValue, colors, formatter = (v) => v, maxItems = 10 }) => {
  const top = data.slice(0, maxItems);
  const max = top[0]?.[keyValue] || 1;
  return (
    <div className="space-y-3">
      {top.map((item, i) => {
        const pct = Math.round(((item[keyValue] || 0) / max) * 100);
        const color = Array.isArray(colors) ? colors[i % colors.length] : colors;
        return (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-gray-700 dark:text-slate-300 font-medium truncate max-w-[55%]">{item[keyLabel] || `Item ${i + 1}`}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">{formatter(item[keyValue] || 0)}</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN REPORTS PAGE
// ════════════════════════════════════════════════════════════════════════════
const Reports = () => {
  const isDark = useSelector((s) => s.theme.mode) === 'dark';
  const ct = useChartTheme(isDark);
  const [exporting, setExporting] = useState(null);

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: roiData, isLoading: roiLoading } = useQuery({
    queryKey: ['reports', 'vehicle-roi'],
    queryFn: reportService.getVehicleROI,
  });
  const { data: fuelEffData, isLoading: fuelLoading } = useQuery({
    queryKey: ['reports', 'fuel-efficiency'],
    queryFn: reportService.getFuelEfficiency,
  });
  const { data: revData, isLoading: revLoading } = useQuery({
    queryKey: ['reports', 'revenue-cost'],
    queryFn: reportService.getRevenueCost,
  });
  const { data: opCostResp } = useQuery({
    queryKey: ['expenses', 'operational-cost'],
    queryFn: expenseService.getOperationalCost,
  });
  const { data: kpis, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: dashboardService.getKpis,
  });
  const { data: widgets, isLoading: widgetsLoading } = useQuery({
    queryKey: ['dashboard', 'widgets'],
    queryFn: dashboardService.getWidgets,
  });
  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: dashboardService.getCharts,
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const roiList     = useMemo(() => roiData?.data || roiData || [], [roiData]);
  const effList     = useMemo(() => fuelEffData?.data || [], [fuelEffData]);
  const revCost     = useMemo(() => revData?.data || {}, [revData]);
  const opCost      = opCostResp?.data?.operationalCost ?? opCostResp?.operationalCost;
  const vehicleStatus = useMemo(() => (widgets?.vehicleStatus || []).map(v => ({ name: v.status, value: v.count })), [widgets]);
  const fleetStatus   = useMemo(() => (widgets?.fleetStatus || []).map(v => ({ name: v.type || 'Unknown', value: v.count })), [widgets]);
  const opSeries      = useMemo(() => charts?.operationalCostSeries || [], [charts]);

  const fuelTotal        = revCost.fuel || 0;
  const maintTotal       = revCost.maintenance || 0;
  const totalExpenses    = fuelTotal + maintTotal;

  const avgFuelEff = useMemo(() => {
    if (!effList.length) return null;
    const valid = effList.filter(e => e.avgEfficiency > 0);
    return valid.length ? (valid.reduce((s, e) => s + e.avgEfficiency, 0) / valid.length) : null;
  }, [effList]);

  const avgCostPerKm = useMemo(() => {
    const valid = roiList.filter(v => v.costPerKm != null);
    return valid.length ? (valid.reduce((s, v) => s + v.costPerKm, 0) / valid.length) : null;
  }, [roiList]);

  const calculateROI = (v) => {
    const revenue = (v.totalDistanceKm || 0) * 45 + (v.completedTrips || 0) * 1500;
    const profit  = revenue - ((v.fuelCost || 0) + (v.maintenanceCost || 0));
    return (profit / (v.acquisitionCost || 1)) * 100;
  };
  const avgROI = useMemo(() => roiList.length ? roiList.reduce((s, v) => s + calculateROI(v), 0) / roiList.length : null, [roiList]);

  // Cost breakdown pie
  const costBreakdown = useMemo(() => {
    const base = [
      { name: 'Fuel',        value: fuelTotal },
      { name: 'Maintenance', value: maintTotal },
    ];
    (revCost.expensesByType || []).forEach(e => {
      if (e.type && e.total > 0) base.push({ name: e.type, value: e.total });
    });
    return base.filter(b => b.value > 0);
  }, [revCost, fuelTotal, maintTotal]);

  // Top vehicles by cost
  const topByCost = useMemo(() => [...roiList].sort((a, b) => (b.totalCostOfOwnership || 0) - (a.totalCostOfOwnership || 0)).slice(0, 10), [roiList]);

  // ROI ranking (best performers)
  const roiRanking = useMemo(() => [...roiList].map(v => ({ ...v, roi: parseFloat(calculateROI(v).toFixed(1)) })).sort((a, b) => b.roi - a.roi).slice(0, 8), [roiList]);

  // Fuel efficiency per vehicle (sorted)
  const fuelEffVehicles = useMemo(() => [...effList].sort((a, b) => (b.avgEfficiency || 0) - (a.avgEfficiency || 0)).slice(0, 10), [effList]);

  // Monthly op cost series with month labels
  const monthlyCost = useMemo(() => opSeries.map(d => ({
    ...d,
    label: d.month ? d.month.substring(0, 7) : '',
    total: (d.fuel || 0) + (d.maintenance || 0),
  })), [opSeries]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async (type, format) => {
    setExporting(`${type}-${format}`);
    try {
      const fn = format === 'csv' ? reportService.exportCSV : reportService.exportPDF;
      const res = await fn(type);
      const blob = new Blob([res.data], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} report downloaded.`);
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(null);
    }
  };

  const fmt = (v) => `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-8">

      {/* ══ SECTION 1: EXECUTIVE KPIs ══════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Activity} title="Executive Summary" subtitle="Live aggregated metrics across all fleet operations" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">

          <KpiCard icon={Truck} label="Fleet Utilization" color={PALETTE.blue}
            raw={kpis?.fleetUtilization ?? 0} suffix="%" decimals={1}
            trend={2.4} note="Active trips / total vehicles" />

          <KpiCard icon={Activity} label="Active Trips" color={PALETTE.green}
            raw={kpis?.activeTrips ?? 0} decimals={0}
            note={`${kpis?.pendingTrips ?? 0} pending dispatch`} />

          <KpiCard icon={Fuel} label="Total Fuel Cost" color={PALETTE.amber}
            raw={fuelTotal} prefix="₹" decimals={0}
            trend={-3.1} note="All fuel log entries" />

          <KpiCard icon={Wrench} label="Maintenance Cost" color={PALETTE.red}
            raw={maintTotal} prefix="₹" decimals={0}
            note="All maintenance records" />

          <KpiCard icon={DollarSign} label="Operational Cost" color={PALETTE.purple}
            raw={opCost ?? totalExpenses} prefix="₹" decimals={0}
            note="Fuel + Maintenance + Misc" />

          <KpiCard icon={Zap} label="Avg Fuel Efficiency" color={PALETTE.cyan}
            raw={avgFuelEff ?? 0} suffix=" km/l" decimals={1}
            note="Distance ÷ Liters consumed" />

          <KpiCard icon={TrendingUp} label="Avg Cost per KM" color={PALETTE.orange}
            raw={avgCostPerKm ?? 0} prefix="₹" decimals={2}
            note="Total TCO ÷ KM driven" />

          <KpiCard icon={BarChart2} label="Avg Vehicle ROI" color={PALETTE.teal}
            raw={avgROI ?? 0} suffix="%" decimals={1}
            note="(Revenue – Costs) / Acquisition" />

        </div>
      </section>

      {/* ══ SECTION 2: FLEET ANALYTICS ═════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Truck} title="Fleet Analytics" subtitle="Vehicle status, type distribution and cost ranking" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          {/* Vehicle Status Donut */}
          <Panel>
            <PanelTitle>Vehicle Status Distribution</PanelTitle>
            {widgetsLoading ? <Skeleton /> :
              vehicleStatus.length === 0 ? <EmptyState /> :
              <DonutChart data={vehicleStatus} colorMap={STATUS_COLORS} isDark={isDark} formatter={(v) => `${v} vehicles`} />
            }
          </Panel>

          {/* Fleet Type Distribution */}
          <Panel>
            <PanelTitle>Fleet Type Breakdown</PanelTitle>
            {widgetsLoading ? <Skeleton /> :
              fleetStatus.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={fleetStatus} layout="vertical" barSize={14} margin={{ left: 8, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: ct.tickColor }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: ct.tickColor }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<CustomTooltip isDark={isDark} formatter={(v) => `${v} vehicles`} />} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {fleetStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        {/* Top 10 Vehicles by Cost */}
        <Panel>
          <PanelTitle>Top 10 Vehicles by Total Cost of Ownership</PanelTitle>
          {roiLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h="h-5" />)}</div>
          ) : topByCost.length === 0 ? <EmptyState /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {topByCost.map((v, i) => {
                const max = topByCost[0]?.totalCostOfOwnership || 1;
                const pct = Math.round(((v.totalCostOfOwnership || 0) / max) * 100);
                const color = [PALETTE.red, PALETTE.orange, PALETTE.amber, PALETTE.purple, PALETTE.blue, PALETTE.cyan, PALETTE.green, PALETTE.teal, PALETTE.indigo, PALETTE.pink][i];
                return (
                  <div key={v.vehicleId || i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-700 dark:text-slate-300 font-medium truncate max-w-[60%]">{v.vehicleName || v.registrationNumber}</span>
                      <span className="text-xs font-mono text-gray-500 dark:text-slate-400">{fmt(v.totalCostOfOwnership)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Vehicle ROI Ranking */}
        <Panel className="mt-4">
          <PanelTitle>Vehicle ROI Ranking (Best → Worst)</PanelTitle>
          {roiLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h="h-5" />)}</div>
          ) : roiRanking.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roiRanking} barSize={18} margin={{ left: 0, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} vertical={false} />
                <XAxis dataKey="vehicleName" tick={{ fontSize: 9, fill: ct.tickColor }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: ct.tickColor }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<CustomTooltip isDark={isDark} formatter={(v) => `${v.toFixed(1)}%`} />} />
                <Bar dataKey="roi" name="ROI %" radius={[3, 3, 0, 0]}>
                  {roiRanking.map((entry, i) => <Cell key={i} fill={entry.roi >= 0 ? PALETTE.green : PALETTE.red} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </section>

      {/* ══ SECTION 3: FUEL ANALYTICS ══════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Fuel} title="Fuel Analytics" subtitle="Consumption trends, efficiency comparison and cost per km" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Monthly Fuel Cost Trend */}
          <Panel>
            <PanelTitle>Monthly Fuel Cost Trend</PanelTitle>
            {chartsLoading ? <Skeleton /> :
              monthlyCost.length === 0 ? <EmptyState message="No fuel trend data" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyCost} margin={{ left: 0, right: 8 }}>
                  <defs>
                    <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PALETTE.amber} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PALETTE.amber} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: ct.tickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: ct.tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip isDark={isDark} formatter={fmt} />} />
                  <Area type="monotone" dataKey="fuel" name="Fuel Cost" stroke={PALETTE.amber} fill="url(#fuelGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          {/* Fuel Efficiency per Vehicle */}
          <Panel>
            <PanelTitle>Fuel Efficiency per Vehicle (km/l)</PanelTitle>
            {fuelLoading ? <Skeleton /> :
              fuelEffVehicles.length === 0 ? <EmptyState message="No fuel efficiency data" /> : (
              <HBarRanking
                data={fuelEffVehicles}
                keyLabel="vehicleName"
                keyValue="avgEfficiency"
                colors={[PALETTE.cyan, PALETTE.blue, PALETTE.teal, PALETTE.green, PALETTE.indigo, PALETTE.purple, PALETTE.amber, PALETTE.orange, PALETTE.red, PALETTE.pink]}
                formatter={(v) => `${v?.toFixed(1)} km/l`}
              />
            )}
          </Panel>

          {/* Fuel Cost by Vehicle */}
          <Panel className="md:col-span-2">
            <PanelTitle>Fuel Cost by Vehicle</PanelTitle>
            {fuelLoading ? <Skeleton h="h-56" /> :
              effList.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[...effList].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0)).slice(0, 12)} barSize={20} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} vertical={false} />
                  <XAxis dataKey="vehicleName" tick={{ fontSize: 9, fill: ct.tickColor }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 9, fill: ct.tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip isDark={isDark} formatter={fmt} />} />
                  <Bar dataKey="totalCost" name="Fuel Cost" fill={PALETTE.amber} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>
      </section>

      {/* ══ SECTION 4: FINANCIAL ANALYTICS ════════════════════════════════ */}
      <section>
        <SectionHeader icon={DollarSign} title="Financial Analytics" subtitle="Revenue vs expenses, cost breakdown and monthly profit trend" />

        {/* Monthly Operational Cost Trend */}
        <Panel className="mb-4">
          <PanelTitle>Monthly Operational Cost — Fuel vs Maintenance</PanelTitle>
          {chartsLoading ? <Skeleton h="h-56" /> :
            monthlyCost.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={monthlyCost} margin={{ left: 0, right: 12 }}>
                <defs>
                  <linearGradient id="fuelArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.amber} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={PALETTE.amber} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="maintArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.red} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={PALETTE.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: ct.tickColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: ct.tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip isDark={isDark} formatter={fmt} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.tickColor }} />
                <Area type="monotone" dataKey="fuel" name="Fuel" stroke={PALETTE.amber} fill="url(#fuelArea)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="maintenance" name="Maintenance" stroke={PALETTE.red} fill="url(#maintArea)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total" name="Total" stroke={PALETTE.blue} strokeWidth={2} dot={{ r: 3, fill: PALETTE.blue }} strokeDasharray="4 2" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Cost Breakdown Pie */}
          <Panel>
            <PanelTitle>Operational Cost Breakdown</PanelTitle>
            {revLoading ? <Skeleton /> :
              costBreakdown.length === 0 ? <EmptyState message="No cost data" /> :
              <DonutChart data={costBreakdown} isDark={isDark} formatter={fmt} />
            }
          </Panel>

          {/* Monthly Trip Volume */}
          <Panel>
            <PanelTitle>Monthly Trip Volume</PanelTitle>
            {chartsLoading ? <Skeleton /> :
              !charts?.monthlyTrips?.length ? <EmptyState message="No trip volume data" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={(charts.monthlyTrips || []).map(d => ({ ...d, label: d.month?.substring(0, 7) }))} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: ct.tickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: ct.tickColor }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} formatter={(v) => `${v} trips`} />} />
                  <Bar dataKey="count" name="Trips" fill={PALETTE.blue} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>
      </section>

      {/* ══ SECTION 5: EXPORT CENTER ════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={FileText} title="Export Center" subtitle="Download operational reports as PDF or CSV" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              type: 'vehicle-roi',
              label: 'Vehicle ROI Report',
              desc: 'Comprehensive financial breakdown per vehicle — TCO, fuel, maintenance, and cost per KM.',
              color: PALETTE.purple,
            },
            {
              type: 'trips',
              label: 'Trips Registry',
              desc: 'All dispatched routes, driver allocations, cargo weights and completion stats.',
              color: PALETTE.blue,
            },
            {
              type: 'expenses',
              label: 'Expenses Registry',
              desc: 'Toll logs, fuel receipts, repair tickets and miscellaneous overhead records.',
              color: PALETTE.amber,
            },
          ].map((r) => (
            <Panel key={r.type} className="flex flex-col justify-between gap-4 hover:border-gray-300 dark:hover:border-slate-700 transition-colors">
              <div>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 border" style={{ backgroundColor: r.color + '15', borderColor: r.color + '40', color: r.color }}>
                  <FileText size={18} />
                </div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">{r.label}</h4>
                <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">{r.desc}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExport(r.type, 'csv')}
                  disabled={!!exporting}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition disabled:opacity-40"
                >
                  {exporting === `${r.type}-csv` ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
                  {exporting === `${r.type}-csv` ? 'Exporting…' : 'CSV'}
                </button>
                <button
                  onClick={() => handleExport(r.type, 'pdf')}
                  disabled={!!exporting}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white rounded hover:opacity-90 transition disabled:opacity-40"
                  style={{ backgroundColor: r.color }}
                >
                  {exporting === `${r.type}-pdf` ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
                  {exporting === `${r.type}-pdf` ? 'Exporting…' : 'PDF'}
                </button>
              </div>
            </Panel>
          ))}
        </div>
      </section>

    </div>
  );
};

export default Reports;
