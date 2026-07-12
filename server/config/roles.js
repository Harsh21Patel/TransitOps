// Central role + permission matrix.
// Single source of truth for RBAC across route middleware, seed data,
// and the client-side Settings > Role Matrix screen.
//
// Access scope per role:
//   Admin            → everything
//   Fleet Manager    → Fleet (vehicles) + Maintenance
//   Dispatcher       → Dashboard + Trips (needs vehicle/driver reads for assignment)
//   Safety Officer   → Drivers only
//   Financial Analyst→ Fuel Logs + Expenses + Reports/Analytics

const ROLES = Object.freeze({
  ADMIN:            'Admin',
  FLEET_MANAGER:    'Fleet Manager',
  DISPATCHER:       'Dispatcher',
  SAFETY_OFFICER:   'Safety Officer',
  FINANCIAL_ANALYST:'Financial Analyst',
});

const ALL_ROLES = Object.values(ROLES);

const PERMISSIONS = Object.freeze({
  // Vehicles — Fleet Manager manages, Dispatcher needs read to assign to trips
  vehicles: {
    read:  [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER],
    write: [ROLES.ADMIN, ROLES.FLEET_MANAGER],
  },

  // Drivers — Safety Officer manages compliance; Dispatcher needs read for assignment
  drivers: {
    read:  [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER, ROLES.DISPATCHER],
    write: [ROLES.ADMIN, ROLES.SAFETY_OFFICER],
  },

  // Trips — Dispatcher creates/manages; Fleet Manager can oversee
  trips: {
    read:  [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER],
    write: [ROLES.ADMIN, ROLES.DISPATCHER],
  },

  // Maintenance — Fleet Manager owns vehicle lifecycle
  maintenance: {
    read:  [ROLES.ADMIN, ROLES.FLEET_MANAGER],
    write: [ROLES.ADMIN, ROLES.FLEET_MANAGER],
  },

  // Fuel Logs — Financial Analyst tracks consumption; Fleet Manager can log
  fuelLogs: {
    read:  [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
    write: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  },

  // Expenses — Financial Analyst owns this domain
  expenses: {
    read:  [ROLES.ADMIN, ROLES.FINANCIAL_ANALYST],
    write: [ROLES.ADMIN, ROLES.FINANCIAL_ANALYST],
  },

  // Reports / Analytics — Financial Analyst + Fleet Manager (operational KPIs)
  reports: {
    read:  [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
    write: [],
  },

  // Dashboard KPIs — Dispatcher (operational view) + Admin + Fleet Manager
  dashboard: {
    read:  [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER],
    write: [],
  },

  // Settings — Admin only
  settings: {
    read:  [ROLES.ADMIN],
    write: [ROLES.ADMIN],
  },

  // Users — Admin only
  users: {
    read:  [ROLES.ADMIN],
    write: [ROLES.ADMIN],
  },
});

module.exports = { ROLES, ALL_ROLES, PERMISSIONS };
