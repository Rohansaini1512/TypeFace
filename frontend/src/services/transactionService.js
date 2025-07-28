import api from './api';

export const transactionService = {
  async getTransactions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const response = await api.get(`/transactions?${params.toString()}`);
    return response.data;
  },

  async getTransaction(id) {
    const response = await api.get(`/transactions/${id}`);
    return response.data.transaction;
  },

  async createTransaction(transactionData) {
    const response = await api.post('/transactions', transactionData);
    return response.data.transaction;
  },

  async updateTransaction(id, updates) {
    const response = await api.put(`/transactions/${id}`, updates);
    return response.data.transaction;
  },

  async deleteTransaction(id) {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  async getSummary(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/transactions/summary?${params.toString()}`);
    return response.data.summary;
  },

  async getCategories() {
    const response = await api.get('/transactions/categories');
    return response.data.categories;
  },

  async bulkInsert(transactions) {
    const response = await api.post('/transactions/bulk', { transactions });
    return response.data;
  }
}; 