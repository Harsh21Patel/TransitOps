// Central role + permission matrix. Single source of truth for RBAC across
// route middleware, seed data, and the client-side Settings > Role Matrix screen.

const ROLES = Object.freeze({
  ADMIN: 'Admin',
  FLEET_MANAGER: 'Fleet Manager',
  DISPATCHER: 'Dispatcher',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
});

const ALL_ROLES = Object.values(ROLES);

// Resource-level permission matrix, consumed by the `authorize()` middleware factory.
const PERMISSIONS = Object.freeze({
  vehicles: {
    read: ALL_ROLES,
    write: [ROLES.ADMIN, ROLES.FLEET_MANAGER],
  },
  drivers: {
    read: ALL_ROLES,
    write: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER],
  },
  trips: {
    read: ALL_ROLES,
    write: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER],
  },
  maintenance: {
    read: ALL_ROLES,
    write: [ROLES.ADMIN, ROLES.FLEET_MANAGER],
  },
  fuelLogs: {
    read: ALL_ROLES,
    write: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER],
  },
  expenses: {
    read: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
    write: [ROLES.ADMIN, ROLES.FINANCIAL_ANALYST],
  },
  reports: {
    read: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
    write: [],
  },
  settings: {
    read: [ROLES.ADMIN],
    write: [ROLES.ADMIN],
  },
  users: {
    read: [ROLES.ADMIN],
    write: [ROLES.ADMIN],
  },
});

module.exports = { ROLES, ALL_ROLES, PERMISSIONS };
