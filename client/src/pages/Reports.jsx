import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, TrendingUp, BarChart3, Info, Fuel, DollarSign } from 'lucide-react';
import { reportService } from '../services/dataService';
import { PageHeader, LoadingPage, Btn } from '../components/ui';
import toast from 'react-hot-toast';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('roi');
  const [exporting, setExporting] = useState(null);

  // Queries
  const { data: roiData, isLoading: roiLoading } = useQuery({
    queryKey: ['reports', 'vehicle-roi'],
    queryFn: reportService.getVehicleROI,
  });

  const { data: fuelData, isLoading: fuelLoading } = useQuery({
    queryKey: ['reports', 'fuel-efficiency'],
    queryFn: reportService.getFuelEfficiency,
  });

  const rois = roiData?.data || [];
  const fuels = fuelData?.data || [];

  const handleExport = async (type, format) => {
    setExporting(`${type}-${format}`);
    try {
      const fn = format === 'csv' ? reportService.exportCSV : reportService.exportPDF;
      const res = await fn(type);
      const blob = new Blob([res], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} report downloaded successfully.`);
    } catch (e) {
      toast.error('Failed to export report.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Reports & Analytics"
        description="Monitor vehicle ROI, fuel efficiency ratings, and download operational spreadsheets."
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {[
          { id: 'roi', label: 'Vehicle ROI Analysis', icon: TrendingUp },
          { id: 'fuel', label: 'Fuel Efficiency Trends', icon: Fuel },
          { id: 'exports', label: 'Operational Exports', icon: Download },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${activeTab === t.id ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'roi' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-sm text-slate-600">
            <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Vehicle ROI calculation:</strong> Total Cost of Ownership (TCO) = Acquisition Cost + logged Fuel Spend + logged Maintenance Spend.
              Cost per KM is computed using completed trip distances. Lower cost per KM denotes higher asset utilization.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {['Vehicle', 'Acquisition Cost', 'Fuel Spend', 'Maint. Spend', 'Total Ownership Cost', 'Completed Trips', 'Total Distance', 'Cost / KM'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roiLoading ? (
                    <tr><td colSpan={8} className="py-12"><LoadingPage /></td></tr>
                  ) : rois.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-center text-slate-400 text-sm">No vehicle ROI statistics available.</td></tr>
                  ) : rois.map(r => (
                    <tr key={r.vehicleId} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{r.vehicleName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{r.registrationNumber}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">₹{r.acquisitionCost?.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">₹{r.fuelCost?.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">₹{r.maintenanceCost?.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">₹{r.totalCostOfOwnership?.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{r.completedTrips}</td>
                      <td className="px-4 py-3.5 text-slate-600">{r.totalDistanceKm?.toLocaleString()} km</td>
                      <td className="px-4 py-3.5 font-bold text-amber-700">
                        {r.costPerKm ? `₹${r.costPerKm}/km` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-sm text-slate-600">
            <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Fuel Efficiency Trends:</strong> Displays total liters filled, total cost of fuel, total distance tracked since previous fill-ups, and average efficiency (km/L). Higher km/L indicates better fuel performance.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {['Vehicle', 'Total Liters Filled', 'Total Fuel Spend', 'Total Tracked Distance', 'Avg Efficiency'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fuelLoading ? (
                    <tr><td colSpan={5} className="py-12"><LoadingPage /></td></tr>
                  ) : fuels.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-sm">No fuel efficiency data available.</td></tr>
                  ) : fuels.map(f => (
                    <tr key={f.registrationNumber} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{f.vehicleName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{f.registrationNumber}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{f.totalLiters?.toFixed(1)} L</td>
                      <td className="px-4 py-3.5 text-slate-600 font-semibold text-slate-900">₹{f.totalCost?.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.totalDistance?.toLocaleString()} km</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600">{f.avgEfficiency} km/L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'exports' && (
        <div className="grid grid-cols-3 gap-6">
          {[
            { type: 'vehicle-roi', label: 'Vehicle ROI Report', desc: 'Download complete vehicle financial breakdown including acquisition, fuel, maintenance, and TCO statistics.' },
            { type: 'trips', label: 'Trips Report', desc: 'Download recent trips, source/destination data, vehicles used, driver assignments, cargo load, and status flags.' },
            { type: 'expenses', label: 'Expenses Report', desc: 'Download itemized expenses sheet including toll logs, parking receipts, maintenance tickets, and general charges.' },
          ].map(r => (
            <div key={r.type} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 bg-slate-50 border border-slate-100 text-slate-600 rounded-lg flex items-center justify-center mb-4">
                  <FileText size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">{r.label}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{r.desc}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-6">
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport(r.type, 'csv')}
                  loading={exporting === `${r.type}-csv`}
                >
                  <Download size={12} /> CSV
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport(r.type, 'pdf')}
                  loading={exporting === `${r.type}-pdf`}
                >
                  <Download size={12} /> PDF
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
