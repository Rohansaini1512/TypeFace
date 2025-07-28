import api from './api';

export const analyticsService = {
  async getSummary(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/analytics/summary?${params.toString()}`);
    return response.data.summary;
  },

  async getCategoryBreakdown(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/analytics/categories?${params.toString()}`);
    return response.data.categories;
  },

  async getTimeline(startDate, endDate, groupBy = 'day') {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('groupBy', groupBy);
    
    const response = await api.get(`/analytics/timeline?${params.toString()}`);
    return response.data.timeline;
  },

  async getTrends(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/analytics/trends?${params.toString()}`);
    return response.data;
  },

  async getMonthlyData(year) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    
    const response = await api.get(`/analytics/monthly?${params.toString()}`);
    return response.data;
  },

  async getInsights(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/analytics/insights?${params.toString()}`);
    return response.data.insights;
  },

  async exportData(startDate, endDate, format = 'json') {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('format', format);
    
    const response = await api.get(`/analytics/export?${params.toString()}`);
    return response.data;
  }
}; 