import api from './api';

export const authService = {
  login: async ({ email, password, rememberMe }) => {
    const { data } = await api.post('/auth/login', { email, password, rememberMe });
    return data.data; // { user, accessToken, accessTokenExpiresIn }
  },

  logout: async () => {
    await api.post('/auth/logout');
  },

  fetchMe: async () => {
    const { data } = await api.get('/auth/me');
    return data.data.user;
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const { data } = await api.patch('/auth/change-password', { currentPassword, newPassword });
    return data;
  },

  refresh: async () => {
    const { data } = await api.post('/auth/refresh');
    return data.data; // { user, accessToken }
  },
};
