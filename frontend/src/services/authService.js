import api from './api';

export const authService = {
  async register(username, email, password) {
    const response = await api.post('/auth/register', {
      username,
      email,
      password
    });
    return response.data;
  },

  async login(username, password) {
    const response = await api.post('/auth/login', {
      username,
      password
    });
    return response.data;
  },

  // FIX: Renamed this function to match its usage in the AuthContext,
  // though getCurrentUser was also a fine name. Consistency is key.
  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  async updateProfile(updates) {
    const response = await api.put('/auth/profile', updates);
    return response.data.user;
  },

  async changePassword(currentPassword, newPassword) {
    // FIX: Removed `confirmPassword` as the backend doesn't use it.
    const response = await api.put('/auth/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  async deleteAccount() {
    const response = await api.delete('/auth/account');
    return response.data;
  }
};