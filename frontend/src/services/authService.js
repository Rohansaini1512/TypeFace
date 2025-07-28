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

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  async updateProfile(updates) {
    const response = await api.put('/auth/profile', updates);
    return response.data.user;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/password', {
      currentPassword,
      newPassword,
      confirmPassword: newPassword
    });
    return response.data;
  },

  async deleteAccount() {
    const response = await api.delete('/auth/account');
    return response.data;
  }
}; 