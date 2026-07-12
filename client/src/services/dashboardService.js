import api from './api';

/**
 * Service handlers for fetching dashboard stats from the server.
 */
export const dashboardService = {
  /**
   * Fetches high-level KPI indicators (e.g. active vehicles, trips, utilization)
   */
  getKpis: async () => {
    const { data } = await api.get('/dashboard/kpis');
    return data.data;
  },

  /**
   * Fetches dashboard widgets data (recent trips list, vehicle type & status distributions)
   */
  getWidgets: async () => {
    const { data } = await api.get('/dashboard/widgets');
    return data.data;
  },

  /**
   * Fetches dashboard charting data (monthly volumes, status breakdown, operational costs)
   */
  getCharts: async () => {
    const { data } = await api.get('/dashboard/charts');
    return data.data;
  },
};
