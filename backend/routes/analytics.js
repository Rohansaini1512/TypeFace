const express = require('express');
const Transaction = require('../models/transaction');
const Category = require('../models/category');
const { authenticateToken } = require('../middleware/auth');
const { validateAnalyticsQuery, validateDateRange } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/analytics/summary
 * @desc    Get financial summary for user
 * @access  Private
 */
router.get('/summary', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters = { startDate, endDate };
    const summary = await Transaction.getSummary(req.user._id, filters);

    res.json({ summary });
  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({
      error: 'Failed to get summary',
      message: 'An error occurred while retrieving the summary'
    });
  }
});

/**
 * @route   GET /api/analytics/categories
 * @desc    Get spending by category
 * @access  Private
 */
router.get('/categories', validateAnalyticsQuery, validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    const filters = { startDate, endDate, type };
    const categoryBreakdown = await Transaction.getAnalytics(req.user._id, filters);

    const result = categoryBreakdown.map(item => ({
      category: item._id,
      total: item.total,
      count: item.count,
      avgAmount: item.avgAmount
    }));

    res.json({ categories: result });
  } catch (error) {
    console.error('Get category analytics error:', error);
    res.status(500).json({
      error: 'Failed to get category analytics',
      message: 'An error occurred while retrieving category data'
    });
  }
});

/**
 * @route   GET /api/analytics/timeline
 * @desc    Get spending timeline
 * @access  Private
 */
router.get('/timeline', validateAnalyticsQuery, validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day', type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Date range required',
        message: 'Start date and end date are required for timeline analytics'
      });
    }

    const filters = { startDate, endDate, groupBy, type };
    const timeline = await Transaction.getTimeline(req.user._id, filters);

    res.json({ timeline });
  } catch (error) {
    console.error('Get timeline analytics error:', error);
    res.status(500).json({
      error: 'Failed to get timeline analytics',
      message: 'An error occurred while retrieving timeline data'
    });
  }
});

/**
 * @route   GET /api/analytics/trends
 * @desc    Get spending trends and insights
 * @access  Private
 */
router.get('/trends', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Get current period data
    const currentFilters = { startDate, endDate };
    const currentSummary = await Transaction.getSummary(req.user._id, currentFilters);
    
    // Calculate previous period for comparison
    let previousStartDate, previousEndDate;
    if (startDate && endDate) {
      const currentStart = new Date(startDate);
      const currentEnd = new Date(endDate);
      const periodLength = currentEnd - currentStart;
      
      previousEndDate = new Date(currentStart);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - periodLength);
      
      previousStartDate = previousStartDate.toISOString().split('T')[0];
      previousEndDate = previousEndDate.toISOString().split('T')[0];
    }

    const previousFilters = { startDate: previousStartDate, endDate: previousEndDate };
    const previousSummary = await Transaction.getSummary(req.user._id, previousFilters);

    // Calculate trends
    const trends = {
      income: {
        current: currentSummary.income.total,
        previous: previousSummary.income.total,
        change: currentSummary.income.total - previousSummary.income.total,
        percentage: previousSummary.income.total > 0 
          ? ((currentSummary.income.total - previousSummary.income.total) / previousSummary.income.total * 100).toFixed(1)
          : 0
      },
      expense: {
        current: currentSummary.expense.total,
        previous: previousSummary.expense.total,
        change: currentSummary.expense.total - previousSummary.expense.total,
        percentage: previousSummary.expense.total > 0 
          ? ((currentSummary.expense.total - previousSummary.expense.total) / previousSummary.expense.total * 100).toFixed(1)
          : 0
      },
      net: {
        current: currentSummary.net,
        previous: previousSummary.net,
        change: currentSummary.net - previousSummary.net,
        percentage: previousSummary.net !== 0 
          ? ((currentSummary.net - previousSummary.net) / Math.abs(previousSummary.net) * 100).toFixed(1)
          : 0
      }
    };

    // Get top spending categories
    const expenseFilters = { startDate, endDate, type: 'expense' };
    const categoryBreakdown = await Transaction.getAnalytics(req.user._id, expenseFilters);
    const expenseCategories = categoryBreakdown
      .slice(0, 5)
      .map(item => ({
        category: item._id,
        total: item.total,
        count: item.count
      }));

    // Get top income sources
    const incomeFilters = { startDate, endDate, type: 'income' };
    const incomeBreakdown = await Transaction.getAnalytics(req.user._id, incomeFilters);
    const incomeCategories = incomeBreakdown
      .slice(0, 5)
      .map(item => ({
        category: item._id,
        total: item.total,
        count: item.count
      }));

    res.json({
      trends,
      topExpenseCategories: expenseCategories,
      topIncomeCategories: incomeCategories,
      period: {
        current: { startDate, endDate },
        previous: { startDate: previousStartDate, endDate: previousEndDate }
      }
    });
  } catch (error) {
    console.error('Get trends analytics error:', error);
    res.status(500).json({
      error: 'Failed to get trends analytics',
      message: 'An error occurred while retrieving trends data'
    });
  }
});

/**
 * @route   GET /api/analytics/monthly
 * @desc    Get monthly spending breakdown
 * @access  Private
 */
router.get('/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const monthlyData = [];
    
    for (let month = 1; month <= 12; month++) {
      const startDate = `${currentYear}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(currentYear, month, 0).toISOString().split('T')[0];
      
      const filters = { startDate, endDate };
      const summary = await Transaction.getSummary(req.user._id, filters);
      
      monthlyData.push({
        month: month,
        monthName: new Date(currentYear, month - 1).toLocaleDateString('en-US', { month: 'long' }),
        income: summary.income.total,
        expense: summary.expense.total,
        net: summary.net,
        transactionCount: summary.income.count + summary.expense.count
      });
    }

    res.json({ monthlyData, year: currentYear });
  } catch (error) {
    console.error('Get monthly analytics error:', error);
    res.status(500).json({
      error: 'Failed to get monthly analytics',
      message: 'An error occurred while retrieving monthly data'
    });
  }
});

/**
 * @route   GET /api/analytics/insights
 * @desc    Get financial insights and recommendations
 * @access  Private
 */
router.get('/insights', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summaryFilters = { startDate, endDate };
    const summary = await Transaction.getSummary(req.user._id, summaryFilters);
    
    const categoryFilters = { startDate, endDate };
    const categoryBreakdown = await Transaction.getAnalytics(req.user._id, categoryFilters);

    const insights = [];

    // Net income insight
    if (summary.net < 0) {
      insights.push({
        type: 'warning',
        title: 'Negative Net Income',
        message: `Your expenses exceed your income by $${Math.abs(summary.net).toFixed(2)}. Consider reducing expenses or increasing income.`,
        priority: 'high'
      });
    } else if (summary.net > 0) {
      insights.push({
        type: 'positive',
        title: 'Positive Net Income',
        message: `Great job! You have a positive net income of $${summary.net.toFixed(2)}.`,
        priority: 'low'
      });
    }

    // High spending categories
    const expenseCategories = categoryBreakdown
      .filter(item => item._id && item.total > 0)
      .sort((a, b) => b.total - a.total);

    if (expenseCategories.length > 0) {
      const topCategory = expenseCategories[0];
      const topCategoryPercentage = (topCategory.total / summary.expense.total * 100).toFixed(1);
      
      if (parseFloat(topCategoryPercentage) > 30) {
        insights.push({
          type: 'info',
          title: 'High Spending Category',
          message: `${topCategory._id} accounts for ${topCategoryPercentage}% of your total expenses. Consider reviewing this category.`,
          priority: 'medium'
        });
      }
    }

    // Spending frequency insight
    if (summary.expense.count > 50) {
      insights.push({
        type: 'info',
        title: 'High Transaction Frequency',
        message: `You have ${summary.expense.count} expense transactions. Consider consolidating small purchases.`,
        priority: 'medium'
      });
    }

    // Income diversity insight
    const incomeFilters = { startDate, endDate, type: 'income' };
    const incomeCategories = await Transaction.getAnalytics(req.user._id, incomeFilters);
    if (incomeCategories.length === 1 && summary.income.total > 0) {
      insights.push({
        type: 'info',
        title: 'Single Income Source',
        message: 'You have only one income source. Consider diversifying your income streams.',
        priority: 'medium'
      });
    }

    // Savings rate insight
    if (summary.income.total > 0) {
      const savingsRate = (summary.net / summary.income.total * 100).toFixed(1);
      if (parseFloat(savingsRate) < 10) {
        insights.push({
          type: 'warning',
          title: 'Low Savings Rate',
          message: `Your savings rate is ${savingsRate}%. Aim for at least 10-20% for financial security.`,
          priority: 'high'
        });
      } else if (parseFloat(savingsRate) > 30) {
        insights.push({
          type: 'positive',
          title: 'Excellent Savings Rate',
          message: `Your savings rate is ${savingsRate}%. Keep up the great work!`,
          priority: 'low'
        });
      }
    }

    res.json({ insights });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      error: 'Failed to get insights',
      message: 'An error occurred while generating insights'
    });
  }
});

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics data
 * @access  Private
 */
router.get('/export', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Date range required',
        message: 'Start date and end date are required for export'
      });
    }

    // Get all data for export
    const summaryFilters = { startDate, endDate };
    const summary = await Transaction.getSummary(req.user._id, summaryFilters);
    
    const categoryFilters = { startDate, endDate };
    const categoryBreakdown = await Transaction.getAnalytics(req.user._id, categoryFilters);
    
    const timelineFilters = { startDate, endDate };
    const timeline = await Transaction.getTimeline(req.user._id, timelineFilters);

    const exportData = {
      period: { startDate, endDate },
      summary,
      categoryBreakdown,
      timeline,
      exportedAt: new Date().toISOString()
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="finance-analytics-${startDate}-${endDate}.csv"`);
      res.send(csvData);
    } else {
      res.json(exportData);
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      error: 'Failed to export analytics',
      message: 'An error occurred while exporting data'
    });
  }
});

/**
 * Convert analytics data to CSV format
 * @param {Object} data - Analytics data
 * @returns {string} CSV string
 */
function convertToCSV(data) {
  const lines = [];
  
  // Summary section
  lines.push('SUMMARY');
  lines.push('Category,Count,Total,Average');
  lines.push(`Income,${data.summary.income.count},${data.summary.income.total},${data.summary.income.avgAmount}`);
  lines.push(`Expense,${data.summary.expense.count},${data.summary.expense.total},${data.summary.expense.avgAmount}`);
  lines.push(`Net,,${data.summary.net},`);
  lines.push('');
  
  // Category breakdown
  lines.push('CATEGORY BREAKDOWN');
  lines.push('Category,Count,Total,Average');
  data.categoryBreakdown.forEach(item => {
    lines.push(`${item._id},${item.count},${item.total},${item.avgAmount}`);
  });
  lines.push('');
  
  // Timeline
  lines.push('TIMELINE');
  lines.push('Date,Type,Total,Count');
  data.timeline.forEach(item => {
    lines.push(`${item._id.date},${item._id.type},${item.total},${item.count}`);
  });
  
  return lines.join('\n');
}

module.exports = router; 