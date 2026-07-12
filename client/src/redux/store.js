import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Future slices mount here as modules are built:
    // vehicles: vehiclesReducer,
    // drivers: driversReducer,
    // trips: tripsReducer,
    // dashboard: dashboardReducer,
  },
  devTools: import.meta.env.MODE !== 'production',
});
