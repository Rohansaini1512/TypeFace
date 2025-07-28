import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  Upload, 
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { transactionService } from '../services/transactionService.js';
import { analyticsService } from '../services/analyticsService.js';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current month's data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];

      // Load summary and recent transactions
      const [summaryData, transactionsData, insightsData] = await Promise.all([
        transactionService.getSummary(startDate, endDate),
        transactionService.getTransactions({ limit: 5, sortBy: 'date', sortOrder: 'DESC' }),
        analyticsService.getInsights(startDate, endDate)
      ]);

      setSummary(summaryData);
      setRecentTransactions(transactionsData.transactions);
      setInsights(insightsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
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

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <TrendingDown className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <BarChart3 className="h-5 w-5 text-blue-600" />;
      default:
        return <BarChart3 className="h-5 w-5 text-gray-600" />;
    }
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your financial overview.</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/transactions/new" className="btn btn-primary">
            <Plus size={18} />
            Add Transaction
          </Link>
          <Link to="/upload" className="btn btn-outline">
            <Upload size={18} />
            Upload Receipt
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                {summary ? formatCurrency(summary.income.total) : '$0.00'}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <ArrowUpRight className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {summary?.income.count || 0} transactions this month
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {summary ? formatCurrency(summary.expense.total) : '$0.00'}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <ArrowDownRight className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {summary?.expense.count || 0} transactions this month
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className={`text-2xl font-bold ${summary?.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary ? formatCurrency(summary.net) : '$0.00'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${summary?.net >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {summary?.net >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {summary?.income.count + summary?.expense.count || 0} total transactions
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Transaction</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary ? formatCurrency(summary.expense.average) : '$0.00'}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Based on expenses
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Transactions</h3>
            <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-500">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">{transaction.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions yet</p>
                <Link to="/transactions/new" className="text-blue-600 hover:text-blue-500">
                  Add your first transaction
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Financial Insights</h3>
            <Link to="/analytics" className="text-sm text-blue-600 hover:text-blue-500">
              View analytics
            </Link>
          </div>
          <div className="space-y-3">
            {insights.length > 0 ? (
              insights.slice(0, 3).map((insight, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getInsightIcon(insight.type)}
                  <div>
                    <p className="font-medium text-gray-900">{insight.title}</p>
                    <p className="text-sm text-gray-600">{insight.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No insights available</p>
                <p className="text-sm">Add more transactions to get personalized insights</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Best Category</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary?.income.total > summary?.expense.total ? 'Income' : 'Expenses'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Savings Rate</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary?.income.total > 0 
                  ? `${((summary.net / summary.income.total) * 100).toFixed(1)}%`
                  : '0%'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 