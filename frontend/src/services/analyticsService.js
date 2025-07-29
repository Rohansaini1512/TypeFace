import api from './api';

export const analyticsService = {
  // This function is called by the Dashboard and needs to return insights
  async getInsights(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/analytics/insights?${params.toString()}`);
    return response.data.insights;
  },
  
  // Other potential analytics functions remain unchanged
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
};