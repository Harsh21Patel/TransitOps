import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { connectSocket, disconnectSocket } from '../services/socketService';
import { Search, Bell, Menu, X, Clock, Wifi, WifiOff, Truck, LogOut, Sun, Moon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../redux/themeSlice';
import toast from 'react-hot-toast';
import TransitOpsLogo from '../components/TransitOpsLogo';

// Navigation scoped strictly by role:
//   ADMIN            → everything
//   FLEET_MANAGER    → Fleet, Maintenance
//   DISPATCHER       → Dashboard, Trips
//   SAFETY_OFFICER   → Drivers
//   FINANCIAL_ANALYST→ Fuel & Expenses, Analytics
const navigation = [
  { name: 'Dashboard',     href: '/dashboard',    roles: ['ADMIN', 'DISPATCHER'] },
  { name: 'Fleet',         href: '/fleet',         roles: ['ADMIN', 'FLEET_MANAGER'] },
  { name: 'Drivers',       href: '/drivers',       roles: ['ADMIN', 'SAFETY_OFFICER'] },
  { name: 'Trips',         href: '/trips',         roles: ['ADMIN', 'DISPATCHER'] },
  { name: 'Maintenance',   href: '/maintenance',   roles: ['ADMIN', 'FLEET_MANAGER'] },
  { name: 'Fuel & Expenses', href: '/fuel',        roles: ['ADMIN', 'FINANCIAL_ANALYST'] },
  { name: 'Analytics',     href: '/reports',       roles: ['ADMIN', 'FLEET_MANAGER', 'FINANCIAL_ANALYST'] },
  { name: 'Settings',      href: '/settings',      roles: ['ADMIN'] },
];

const DashboardLayout = () => {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.theme.mode);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const socketInstance = connectSocket(accessToken);
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectError = () => setSocketConnected(false);

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);
    if (socketInstance.connected) setSocketConnected(true);

    const handleTripEvent = (eventTitle, statusColor) => (trip) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      const newNotification = {
        id: Math.random().toString(36).substr(2, 9),
        title: `${eventTitle}: ${trip.tripCode}`,
        message: `${trip.source} → ${trip.destination}`,
        time: new Date(),
        statusColor,
      };
      setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <Truck className="h-8 w-8 text-amber-500 bg-amber-50 p-1.5 rounded-full flex-shrink-0" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-slate-900">{newNotification.title}</p>
                <p className="mt-1 text-xs text-slate-500">{newNotification.message}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-200">
            <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-slate-600 hover:text-slate-500 focus:outline-none">
              Dismiss
            </button>
          </div>
        </div>
      ), { duration: 4000 });
    };

    socketInstance.on('trip:created', handleTripEvent('New Trip Drafted', 'bg-slate-500'));
    socketInstance.on('trip:dispatched', handleTripEvent('Trip Dispatched', 'bg-blue-500'));
    socketInstance.on('trip:completed', handleTripEvent('Trip Completed', 'bg-emerald-500'));
    socketInstance.on('trip:cancelled', handleTripEvent('Trip Cancelled', 'bg-rose-500'));

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.off('trip:created');
      socketInstance.off('trip:dispatched');
      socketInstance.off('trip:completed');
      socketInstance.off('trip:cancelled');
      disconnectSocket();
    };
  }, [accessToken, queryClient]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully.');
      navigate('/login');
    } catch {
      toast.error('Failed to log out.');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Abbreviated display name: "Raven K."
  const getShortName = (name) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const getRoleLabel = (role) => {
    const map = {
      ADMIN: 'Admin',
      FLEET_MANAGER: 'Fleet Mgr',
      DISPATCHER: 'Dispatcher',
      SAFETY_OFFICER: 'Safety Officer',
      FINANCIAL_ANALYST: 'Fin. Analyst',
    };
    return map[role] || role;
  };

  const allowedNavigation = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <TransitOpsLogo size={28} variant="full" theme={theme === 'dark' ? 'dark' : 'light'} />
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {allowedNavigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            location.pathname.startsWith(item.href + '/') ||
            // Match role dashboards under /dashboard
            (item.href === '/dashboard' && location.pathname.endsWith('/dashboard'));
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`block px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-semibold border-l-4 border-amber-500 pl-4'
                  : 'text-gray-700 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60 hover:text-gray-900 dark:hover:text-slate-100 font-normal'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-semibold text-xs flex-shrink-0">
            {getInitials(user?.name)}
          </div>
          <span className="text-xs text-gray-600 dark:text-slate-400 flex-1 truncate">{user?.name}</span>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800" style={{ width: '160px', minWidth: '160px' }}>
        <SidebarContent />
      </aside>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800" style={{ width: '200px' }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-200 dark:border-slate-800">
              <TransitOpsLogo size={26} variant="full" theme={theme === 'dark' ? 'dark' : 'light'} />
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-350">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 py-4 overflow-y-auto">
              {allowedNavigation.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`block px-5 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-semibold border-l-4 border-amber-500 pl-4'
                        : 'text-gray-700 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60 font-normal'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-12 items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-500 dark:text-slate-400 md:hidden">
              <Menu size={18} />
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-amber-400 w-52 text-gray-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${socketConnected ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
              {socketConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              <span className="hidden sm:inline">{socketConnected ? 'Live' : 'Offline'}</span>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-1.5 rounded-full border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition"
              title="Toggle Dark Mode"
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-1.5 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition"
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-amber-500 rounded-full" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">Operations Log</span>
                    <button onClick={() => setNotifications([])} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-350">Clear</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-gray-400 dark:text-slate-500">
                        <Clock size={20} className="mb-1" />
                        <p className="text-xs">No recent events</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 flex gap-2">
                          <span className={`h-2 w-2 mt-1 rounded-full flex-shrink-0 ${n.statusColor}`} />
                          <div>
                            <p className="text-xs font-medium text-gray-800 dark:text-slate-300">{n.title}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{n.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User chip */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-blue-500 text-white rounded-full px-2 py-0.5">
                <span className="text-xs font-medium hidden sm:inline">{getRoleLabel(user?.role)}</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px]">
                  {getInitials(user?.name)}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
