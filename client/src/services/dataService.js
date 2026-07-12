import api from './api';

export const vehicleService = {
  getAll: (params = {}) => api.get('/vehicles', { params }).then(r => r.data),
  getById: (id) => api.get(`/vehicles/${id}`).then(r => r.data),
  create: (data) => api.post('/vehicles', data).then(r => r.data),
  update: (id, data) => api.patch(`/vehicles/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/vehicles/${id}`).then(r => r.data),
};

export const driverService = {
  getAll: (params = {}) => api.get('/drivers', { params }).then(r => r.data),
  getById: (id) => api.get(`/drivers/${id}`).then(r => r.data),
  create: (data) => api.post('/drivers', data).then(r => r.data),
  update: (id, data) => api.patch(`/drivers/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/drivers/${id}`).then(r => r.data),
  getExpiring: (days = 30) => api.get('/drivers/expiring-licenses', { params: { days } }).then(r => r.data),
};

export const tripService = {
  getAll: (params = {}) => api.get('/trips', { params }).then(r => r.data),
  getById: (id) => api.get(`/trips/${id}`).then(r => r.data),
  getBoard: () => api.get('/trips/board').then(r => r.data),
  create: (data) => api.post('/trips', data).then(r => r.data),
  update: (id, data) => api.patch(`/trips/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/trips/${id}`).then(r => r.data),
  dispatch: (id) => api.post(`/trips/${id}/dispatch`).then(r => r.data),
  complete: (id) => api.post(`/trips/${id}/complete`).then(r => r.data),
  cancel: (id, reason) => api.post(`/trips/${id}/cancel`, { reason }).then(r => r.data),
};

export const maintenanceService = {
  getAll: (params = {}) => api.get('/maintenance', { params }).then(r => r.data),
  getById: (id) => api.get(`/maintenance/${id}`).then(r => r.data),
  create: (data) => api.post('/maintenance', data).then(r => r.data),
  update: (id, data) => api.patch(`/maintenance/${id}`, data).then(r => r.data),
  close: (id) => api.post(`/maintenance/${id}/close`).then(r => r.data),
  remove: (id) => api.delete(`/maintenance/${id}`).then(r => r.data),
};

export const fuelService = {
  getAll: (params = {}) => api.get('/fuel-logs', { params }).then(r => r.data),
  getById: (id) => api.get(`/fuel-logs/${id}`).then(r => r.data),
  create: (data) => api.post('/fuel-logs', data).then(r => r.data),
  update: (id, data) => api.patch(`/fuel-logs/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/fuel-logs/${id}`).then(r => r.data),
};

export const expenseService = {
  getAll: (params = {}) => api.get('/expenses', { params }).then(r => r.data),
  getById: (id) => api.get(`/expenses/${id}`).then(r => r.data),
  create: (data) => api.post('/expenses', data).then(r => r.data),
  update: (id, data) => api.patch(`/expenses/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/expenses/${id}`).then(r => r.data),
  getOperationalCost: (params = {}) => api.get('/expenses/operational-cost', { params }).then(r => r.data),
};

export const reportService = {
  getVehicleROI: () => api.get('/reports/vehicle-roi').then(r => r.data),
  getFuelEfficiency: (params = {}) => api.get('/reports/fuel-efficiency', { params }).then(r => r.data),
  getRevenueCost: (params = {}) => api.get('/reports/revenue-cost', { params }).then(r => r.data),
  exportCSV: (type) => api.get(`/reports/export/${type}`, { params: { format: 'csv' }, responseType: 'blob' }),
  exportPDF: (type) => api.get(`/reports/export/${type}`, { params: { format: 'pdf' }, responseType: 'blob' }),
};
