import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { analyticsService } from '../services/analyticsService.js';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];

      const [summaryData, categoryData, insightsData] = await Promise.all([
        analyticsService.getSummary(startDate, endDate),
        analyticsService.getCategoryBreakdown(startDate, endDate),
        analyticsService.getInsights(startDate, endDate)
      ]);

      setSummary(summaryData);
      setCategoryData(categoryData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Financial insights and spending analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                {summary ? formatCurrency(summary.income.total) : '$0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {summary ? formatCurrency(summary.expense.total) : '$0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className={`text-2xl font-bold ${summary?.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary ? formatCurrency(summary.net) : '$0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
        <div className="space-y-3">
          {categoryData
            .filter(item => item.type === 'expense')
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
            .map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="font-medium">{item.category}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(item.total)}</p>
                  <p className="text-sm text-gray-500">{item.count} transactions</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Insights */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Financial Insights</h3>
        <div className="space-y-3">
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-1 rounded ${
                  insight.type === 'positive' ? 'bg-green-100' :
                  insight.type === 'warning' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  <BarChart3 className={`h-4 w-4 ${
                    insight.type === 'positive' ? 'text-green-600' :
                    insight.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <div>
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-sm text-gray-600">{insight.message}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No insights available yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics; 