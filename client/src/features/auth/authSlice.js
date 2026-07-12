import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

// Called once on app load to silently restore a session using the httpOnly
// refresh cookie, so a page refresh doesn't force a re-login.
export const bootstrapSession = createAsyncThunk(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.refresh();
    } catch (err) {
      return rejectWithValue(null);
    }
  },
  {
    condition: (_, { getState }) => {
      const { auth } = getState();
      if (auth.status === 'loading') {
        return false;
      }
    },
  }
);

const initialState = {
  user: null,
  accessToken: null,
  status: 'idle', // idle | loading | succeeded | failed
  bootstrapped: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken: (state, action) => {
      state.accessToken = action.payload;
    },
    logoutLocal: (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'idle';
      })
      .addCase(bootstrapSession.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.status = 'succeeded';
        state.bootstrapped = true;
      })
      .addCase(bootstrapSession.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'idle';
        state.bootstrapped = true;
      });
  },
});

export const { setAccessToken, logoutLocal } = authSlice.actions;
export default authSlice.reducer;
