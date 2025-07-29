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
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];

      const [summaryData, transactionsData, insightsData] = await Promise.all([
        transactionService.getSummary(startDate, endDate),
        transactionService.getTransactions({ limit: 5, sortBy: 'date', sortOrder: 'desc' }),
        analyticsService.getInsights(startDate, endDate)
      ]);

      setSummary(summaryData);
      setRecentTransactions(transactionsData.transactions);
      setInsights(insightsData || []); // Ensure insights is always an array
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive': return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'warning': return <TrendingDown className="h-5 w-5 text-yellow-600" />;
      default: return <BarChart3 className="h-5 w-5 text-blue-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your financial overview for the month.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total Income</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.income?.total)}</p>
          <p className="text-sm text-gray-500 mt-2">{summary?.income?.count || 0} transactions</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(summary?.expense?.total)}</p>
          <p className="text-sm text-gray-500 mt-2">{summary?.expense?.count || 0} transactions</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Net Income</p>
          <p className={`text-2xl font-bold ${summary?.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(summary?.net)}</p>
           <p className="text-sm text-gray-500 mt-2">This month's balance</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Avg. Expense</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.expense?.average)}</p>
          <p className="text-sm text-gray-500 mt-2">Average transaction cost</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <Link to="/transactions" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {tx.type === 'income' ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500">{tx.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-sm text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions found for this month.</p>
                <Link to="/transactions/new" className="text-blue-600 hover:underline mt-1 block">Add your first one</Link>
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold">Financial Insights</h3>
             <Link to="/analytics" className="text-sm text-blue-600 hover:underline">Details</Link>
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
                <p>No insights available yet.</p>
                <p className="text-sm">Add more data to generate insights.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;