import { useState } from 'react';
import toast from 'react-hot-toast';

const RBAC_MATRIX = [
  {
    role: 'Fleet Manager',
    fleet: '✓', drivers: '✓', trips: '—', fuelExp: '—', analytics: '✓',
  },
  {
    role: 'Dispatcher',
    fleet: 'View', drivers: '—', trips: '✓', fuelExp: '—', analytics: '—',
  },
  {
    role: 'Safety Officer',
    fleet: '—', drivers: '✓', trips: 'View', fuelExp: '—', analytics: '—',
  },
  {
    role: 'Financial Analyst',
    fleet: 'View', drivers: '—', trips: '—', fuelExp: '✓', analytics: '✓',
  },
];

const Settings = () => {
  const [general, setGeneral] = useState({
    depotName: 'Gandhinagar Depot GJ4',
    currency: 'INR (₹)',
    distanceUnit: 'Kilometers',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Persist to localStorage for now (no dedicated settings API)
      localStorage.setItem('transitops_settings', JSON.stringify(general));
      await new Promise(r => setTimeout(r, 600));
      toast.success('Settings saved.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const getCellStyle = (val) => {
    if (val === '✓') return 'text-gray-800 dark:text-slate-200 font-semibold';
    if (val === 'View') return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-405 dark:text-slate-600';
  };

  return (
    <div className="flex gap-10 flex-wrap lg:flex-nowrap">
      {/* LEFT — General settings */}
      <div style={{ minWidth: '280px', maxWidth: '360px' }}>
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">General</p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Depot Name</label>
            <input
              value={general.depotName}
              onChange={e => setGeneral(g => ({ ...g, depotName: e.target.value }))}
              placeholder="Gandhinagar Depot GJ4"
              className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Currency</label>
            <input
              value={general.currency}
              onChange={e => setGeneral(g => ({ ...g, currency: e.target.value }))}
              placeholder="INR (₹)"
              className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Distance Unit</label>
            <input
              value={general.distanceUnit}
              onChange={e => setGeneral(g => ({ ...g, distanceUnit: e.target.value }))}
              placeholder="Kilometers"
              className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded transition disabled:opacity-60 hover:opacity-90"
            style={{ backgroundColor: '#f59e0b' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* RIGHT — RBAC matrix */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Role-Based Access (RBAC)</p>
        <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800">
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Fleet</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Drivers</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Trips</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Fuel/Exp</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Analytics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {RBAC_MATRIX.map(row => (
                  <tr key={row.role} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-slate-200">{row.role}</td>
                    {['fleet', 'drivers', 'trips', 'fuelExp', 'analytics'].map(col => (
                      <td key={col} className={`px-5 py-3 text-center text-sm ${getCellStyle(row[col])}`}>
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex gap-4 text-xs text-gray-500 dark:text-slate-405">
          <span><strong className="text-gray-800 dark:text-slate-200">✓</strong> = Full access</span>
          <span><strong className="text-blue-600 dark:text-blue-400">View</strong> = Read-only</span>
          <span><strong className="text-gray-400 dark:text-slate-600">—</strong> = No access</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
