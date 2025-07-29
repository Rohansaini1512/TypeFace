import React, { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService.js';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon } from 'lucide-react';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  
  // State for date range filtering
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  });

  // Memoized function to load all analytics data
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = dateRange;
      const [summaryData, categoryBreakdown, timeline] = await Promise.all([
        analyticsService.getSummary(startDate, endDate),
        analyticsService.getCategoryBreakdown(startDate, endDate),
        analyticsService.getTimeline(startDate, endDate)
      ]);

      setSummary(summaryData);
      
      // Process category data
      const processedCategories = Array.isArray(categoryBreakdown) 
        ? categoryBreakdown 
        : (categoryBreakdown.categories || []);
      setCategoryData(processedCategories);
      
      // Process timeline data for the chart
      const processedTimeline = Array.isArray(timeline) 
        ? timeline.reduce((acc, item) => {
            const date = new Date(item._id.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!acc[date]) {
              acc[date] = { date, income: 0, expense: 0 };
            }
            acc[date][item._id.type] = item.total;
            return acc;
          }, {})
        : {};
      
      setTimelineData(Object.values(processedTimeline));

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Currency formatter for Indian Rupees (INR)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const handleDateChange = (e) => {
    setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Process category data for the pie chart
  const topExpenseCategories = categoryData
    .filter(item => item && item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6) // Limit to 6 categories for better visibility
    .map((item, index) => ({
      name: item.category || 'Uncategorized',
      value: item.total,
      count: item.count,
      avgAmount: item.avgAmount,
      percent: 0, // Will be calculated below
      color: [
        '#4F46E5', // indigo-600
        '#10B981', // emerald-500
        '#F59E0B', // amber-500
        '#EF4444', // red-500
        '#8B5CF6', // violet-500
        '#EC4899'  // pink-500
      ][index % 6]
    }));

  // Calculate percentages for the tooltip
  const totalExpense = topExpenseCategories.reduce((sum, item) => sum + item.value, 0);
  const categoriesWithPercentage = topExpenseCategories.map(item => ({
    ...item,
    percent: totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0
  }));

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;  
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-500 mt-1">
            {data.percent}% of total • {data.count} transaction{data.count !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-500">
            Average: {formatCurrency(data.avgAmount || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend item
  const renderCustomizedLegend = ({ payload }) => (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center text-sm">
          <div 
            className="w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-700">{entry.value}</span>
          <span className="ml-1 font-medium text-gray-900">
            ({entry.payload.percent}%)
          </span>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Analytics</h1>
          <p className="text-gray-600">An overview of your income and expenses.</p>
        </div>
        <div className="flex items-center space-x-4 bg-white p-2 rounded-lg border">
          <CalendarIcon className="text-gray-500" size={20} />
          <input type="date" name="startDate" value={dateRange.startDate} onChange={handleDateChange} className="form-input text-sm"/>
          <span className="text-gray-500">-</span>
          <input type="date" name="endDate" value={dateRange.endDate} onChange={handleDateChange} className="form-input text-sm"/>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <TrendingUp className="h-6 w-6 text-green-500 mb-2" />
          <p className="text-sm font-medium text-gray-600">Total Income</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary?.income?.total)}</p>
        </div>
        <div className="card">
          <TrendingDown className="h-6 w-6 text-red-500 mb-2" />
          <p className="text-sm font-medium text-gray-600">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary?.expense?.total)}</p>
        </div>
        <div className="card">
          <DollarSign className="h-6 w-6 text-blue-500 mb-2" />
          <p className="text-sm font-medium text-gray-600">Net Balance</p>
          <p className={`text-2xl font-bold ${summary?.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(summary?.net)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Chart */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold mb-4">Income vs. Expense</h3>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timelineData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Income" />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">No data for this period.</div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
              <p className="text-sm text-gray-500">Top expense categories</p>
            </div>
            <div className="text-sm text-gray-500">
              Total: <span className="font-medium text-gray-900">{formatCurrency(totalExpense)}</span>
            </div>
          </div>
          
          {categoriesWithPercentage.length > 0 ? (
            <div className="flex flex-col">
              <div className="h-64 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoriesWithPercentage}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      {categoriesWithPercentage.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                          className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Custom Legend */}
              <div className="mt-2">
                {renderCustomizedLegend({ payload: categoriesWithPercentage.map((item, index) => ({
                  value: item.name,
                  color: item.color,
                  payload: item
                })) })}
              </div>
              
              {/* Summary Stats */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Categories</p>
                    <p className="text-lg font-semibold">{categoriesWithPercentage.length}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Total Transactions</p>
                    <p className="text-lg font-semibold">
                      {categoriesWithPercentage.reduce((sum, item) => sum + (item.count || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-gray-50 rounded-lg">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="text-gray-700 font-medium mb-1">No expense data</h4>
              <p className="text-sm text-gray-500 max-w-xs">
                Add some transactions to see a breakdown of your spending by category.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;