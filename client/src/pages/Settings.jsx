import { useAuth } from '../hooks/useAuth';
import { PageHeader, FormField, inputCls, Btn } from '../components/ui';
import { Shield, User, Sliders, Bell } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useAuth();
  const [activeSec, setActiveSec] = useState('profile');

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Settings saved locally (simulation).');
  };

  const rolesMatrix = [
    { module: 'Dashboard', admin: 'Read / Write', manager: 'Read / Write', dispatcher: 'Read / Write', safety: 'Read / Write', analyst: 'Read / Write' },
    { module: 'Fleet Registry', admin: 'Read / Write', manager: 'Read / Write', dispatcher: 'Read / Write', safety: 'Read / Write', analyst: 'Read Only' },
    { module: 'Driver Profiles', admin: 'Read / Write', manager: 'Read / Write', dispatcher: 'Read Only', safety: 'Read / Write', analyst: 'Read Only' },
    { module: 'Trip Dispatcher', admin: 'Read / Write', manager: 'Read / Write', dispatcher: 'Read / Write', safety: 'Read Only', analyst: 'Read Only' },
    { module: 'Maintenance Logs', admin: 'Read / Write', manager: 'Read / Write', dispatcher: 'Read Only', safety: 'Read / Write', analyst: 'Read Only' },
    { module: 'Fuel Logs', admin: 'Read / Write', manager: 'Read / Write', dispatcher: 'Read / Write', safety: 'Read Only', analyst: 'Read / Write' },
    { module: 'Expenses', admin: 'Read / Write', manager: 'Read / Write', dispatcher: 'Read Only', safety: 'Read Only', analyst: 'Read / Write' },
    { module: 'Reports & Exports', admin: 'Read / Write', manager: 'Read / Write', dispatcher: 'No Access', safety: 'No Access', analyst: 'Read / Write' },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Settings"
        description="Configure account details, view system settings, and inspect security access roles."
      />

      <div className="flex gap-6 mt-6">
        {/* Sidebar Nav */}
        <div className="w-64 flex flex-col gap-1.5 flex-shrink-0">
          {[
            { id: 'profile', label: 'My Profile', icon: User },
            { id: 'rbac', label: 'Role Access Matrix (RBAC)', icon: Shield },
            { id: 'system', label: 'System Configuration', icon: Sliders },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSec(s.id)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-left transition ${activeSec === s.id ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <s.icon size={16} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Panel Content */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {activeSec === 'profile' && (
            <form onSubmit={handleSave} className="space-y-4 max-w-xl">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">My Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Full Name">
                  <input defaultValue={user?.name} className={inputCls(false)} />
                </FormField>
                <FormField label="Email Address">
                  <input defaultValue={user?.email} disabled className={`${inputCls(false)} bg-slate-50 cursor-not-allowed`} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="System Role">
                  <span className="inline-block px-3 py-2 bg-amber-50 text-amber-700 font-bold border border-amber-200 text-xs rounded-lg mt-0.5">
                    {user?.role}
                  </span>
                </FormField>
                <FormField label="Contact Number">
                  <input defaultValue={user?.phone || '—'} className={inputCls(false)} />
                </FormField>
              </div>
              <div className="pt-2">
                <Btn type="submit">Update Profile</Btn>
              </div>
            </form>
          )}

          {activeSec === 'rbac' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Role-Based Access Control (RBAC)</h3>
                <p className="text-xs text-slate-400 mt-0.5">System-wide permissions matrix. Changes must be made in the server roles configuration.</p>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 text-left">Module / Resource</th>
                      <th className="px-4 py-3 text-left">Admin</th>
                      <th className="px-4 py-3 text-left">Fleet Mgr</th>
                      <th className="px-4 py-3 text-left">Dispatcher</th>
                      <th className="px-4 py-3 text-left">Safety Officer</th>
                      <th className="px-4 py-3 text-left">Financial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {rolesMatrix.map(m => (
                      <tr key={m.module} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 text-slate-950 font-semibold">{m.module}</td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">{m.admin}</td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">{m.manager}</td>
                        <td className="px-4 py-3">{m.dispatcher}</td>
                        <td className="px-4 py-3">{m.safety}</td>
                        <td className="px-4 py-3">{m.analyst}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSec === 'system' && (
            <div className="space-y-5 max-w-xl">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">System Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">WebSocket Service</div>
                  <div className="font-semibold text-emerald-600 mt-0.5 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active (Vite Proxy)
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Database Engine</div>
                  <div className="font-semibold text-slate-900 mt-0.5">MongoDB (Atlas)</div>
                </div>
                <div>
                  <div className="text-slate-400">Platform Version</div>
                  <div className="font-semibold text-slate-900 mt-0.5">v1.2.0 (Stable)</div>
                </div>
                <div>
                  <div className="text-slate-400">API Gateway</div>
                  <div className="font-semibold text-slate-900 mt-0.5">Express (CORS Enabled)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
