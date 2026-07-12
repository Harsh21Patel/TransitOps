import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { logoutUser } from '../features/auth/authSlice';
import { 
  connectSocket, 
  disconnectSocket, 
  getSocket 
} from '../services/socketService';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Compass, 
  Wrench, 
  Fuel,
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut, 
  Bell, 
  Menu, 
  X, 
  Search, 
  Wifi, 
  WifiOff,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

// Roles configuration mapped to sidebar items
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
  { name: 'Fleet', href: '/fleet', icon: Truck, roles: ['Admin', 'Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
  { name: 'Drivers', href: '/drivers', icon: Users, roles: ['Admin', 'Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
  { name: 'Trips', href: '/trips', icon: Compass, roles: ['Admin', 'Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['Admin', 'Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
  { name: 'Fuel Log', href: '/fuel', icon: Fuel, roles: ['Admin', 'Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
  { name: 'Expenses', href: '/expenses', icon: Receipt, roles: ['Admin', 'Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['Admin', 'Fleet Manager', 'Financial Analyst'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['Admin'] },
];

const DashboardLayout = () => {
  const { user, accessToken } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Connect / Disconnect socket lifecycle
  useEffect(() => {
    if (!accessToken) return;

    const socketInstance = connectSocket(accessToken);

    const handleConnect = () => {
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleConnectError = () => {
      setSocketConnected(false);
    };

    // Attach base events
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);

    // Initial state check
    if (socketInstance.connected) {
      setSocketConnected(true);
    }

    // Handlers for real-time operations updates
    const handleTripEvent = (eventTitle, statusColor) => (trip) => {
      // Invalidate React Query's dashboard queries to pull fresh KPIs and widgets
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Generate a detailed notification item
      const newNotification = {
        id: Math.random().toString(36).substr(2, 9),
        title: `${eventTitle}: ${trip.tripCode}`,
        message: `${trip.source} → ${trip.destination} (${trip.vehicle?.vehicleName || 'Vehicle Assigned'})`,
        time: new Date(),
        statusColor,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // limit to 50 logs

      // Trigger beautiful toast alert
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <Truck className="h-10 w-10 text-amber-500 bg-amber-50 p-2 rounded-full" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {newNotification.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {newNotification.message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-slate-600 hover:text-slate-500 focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        </div>
      ), { duration: 4000 });
    };

    // Socket.IO event registrations
    socketInstance.on('trip:created', handleTripEvent('New Trip Drafted', 'bg-slate-500'));
    socketInstance.on('trip:dispatched', handleTripEvent('Trip Dispatched', 'bg-blue-500'));
    socketInstance.on('trip:completed', handleTripEvent('Trip Completed Successfully', 'bg-emerald-500'));
    socketInstance.on('trip:cancelled', handleTripEvent('Trip Cancelled', 'bg-rose-500'));

    return () => {
      if (socketInstance) {
        socketInstance.off('connect', handleConnect);
        socketInstance.off('disconnect', handleDisconnect);
        socketInstance.off('connect_error', handleConnectError);
        socketInstance.off('trip:created');
        socketInstance.off('trip:dispatched');
        socketInstance.off('trip:completed');
        socketInstance.off('trip:cancelled');
      }
      disconnectSocket();
    };
  }, [accessToken, queryClient]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Logged out successfully.');
      navigate('/login');
    } catch (err) {
      toast.error('Failed to log out.');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Filter menu links based on role permissions
  const allowedNavigation = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200">
        {/* Brand Header */}
        <div className="flex h-16 items-center px-6 gap-2.5 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white shadow-md shadow-amber-500/20">
            <Truck size={20} className="stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">TransitOps</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {allowedNavigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-amber-50/70 text-amber-800 border-l-4 border-amber-500 pl-3'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-amber-600' : 'text-slate-400'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User profile section */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-1.5 bg-slate-50 rounded-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-semibold text-sm">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name?.split(' ')[0]} {user?.name?.split(' ').slice(1).map(n => n[0]).join('.')}
              </p>
              <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded-full">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/40 backdrop-blur-sm">
          <div className="relative flex flex-col w-64 max-w-xs bg-white animate-slide-right">
            <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Truck size={18} />
                </div>
                <span className="text-lg font-bold text-slate-900">TransitOps</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
              {allowedNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-amber-50 text-amber-800 border-l-4 border-amber-500 pl-3'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-amber-600' : 'text-slate-400'} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-3 px-2 py-1.5 bg-slate-50 rounded-xl">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-semibold text-sm">
                  {getInitials(user?.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user?.name}
                  </p>
                  <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded-full">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE ROUTER CONTENT AREA --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between px-6 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            {/* Toggle mobile sidebar */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden transition"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb / Search bar layout */}
            <div className="relative hidden sm:block w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Socket connection indicator */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                socketConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
              title={socketConnected ? 'Real-time sync active' : 'Offline. Reconnecting...'}
            >
              {socketConnected ? (
                <>
                  <Wifi size={13} className="text-emerald-500" />
                  <span className="hidden xs:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff size={13} className="text-slate-400" />
                  <span className="hidden xs:inline">Disconnected</span>
                </>
              )}
            </div>

            {/* Notifications Alert Dropdown */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </button>

              {/* Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800">Operations Log</h3>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <Clock size={28} className="text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400">No recent operations notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-3.5 hover:bg-slate-50/50 flex gap-2.5 transition">
                          <span className={`h-2 w-2 mt-1.5 rounded-full flex-shrink-0 ${notif.statusColor}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {notif.title}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                              {notif.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">{user?.name}</span>
              <span className="hidden xs:inline-block px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded-full">
                {user?.role}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs ring-2 ring-amber-100 shadow-sm shadow-amber-500/10">
                {getInitials(user?.name)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content area */}
        <main className="flex-1 overflow-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
