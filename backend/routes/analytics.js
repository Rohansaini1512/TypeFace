const express = require('express');
const Transaction = require('../models/transaction');
const { authenticateToken } = require('../middleware/auth');
const { validateAnalyticsQuery, validateDateRange } = require('../middleware/validation');

const router = express.Router();

router.use(authenticateToken);

router.get('/summary', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summaryData = await Transaction.getSummary(req.user._id, { startDate, endDate });
    res.json({ summary: summaryData });
  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});


router.get('/categories', validateAnalyticsQuery, validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const categoryBreakdown = await Transaction.getCategoryAnalytics(req.user._id, { startDate, endDate, type: 'expense' });

    const result = categoryBreakdown.map(item => ({
      category: item._id,
      total: item.total,
      count: item.count,
      avgAmount: item.avgAmount,
      type: 'expense' 
    }));

    res.json({ categories: result });
  } catch (error) {
    console.error('Get category analytics error:', error);
    res.status(500).json({ error: 'Failed to get category analytics' });
  }
});


router.get('/timeline', validateAnalyticsQuery, validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const timelineData = await Transaction.getTimeline(req.user._id, { startDate, endDate, groupBy });
    
    res.json({ timeline: timelineData });
    
  } catch (error) {
    console.error('Get timeline analytics error:', error);
    res.status(500).json({ error: 'Failed to get timeline data' });
  }
});



router.get('/trends', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const currentSummary = await Transaction.getSummary(req.user._id, { startDate, endDate });
    
    let previousStartDate, previousEndDate;
    if (startDate && endDate) {
      const currentStart = new Date(startDate);
      const currentEnd = new Date(endDate);
      const periodLength = currentEnd.getTime() - currentStart.getTime();
      
      previousEndDate = new Date(currentStart.getTime() - 1); // Day before start date
      previousStartDate = new Date(previousEndDate.getTime() - periodLength);
      
      previousStartDate = previousStartDate.toISOString().split('T')[0];
      previousEndDate = previousEndDate.toISOString().split('T')[0];
    }

    const previousSummary = await Transaction.getSummary(req.user._id, { startDate: previousStartDate, endDate: previousEndDate });

    const calculateChange = (current, previous) => {
        if (previous > 0) return ((current - previous) / previous * 100).toFixed(1);
        if (current > 0) return 100.0; // From 0 to positive is a 100% increase
        return 0.0;
    };

    const trends = {
      income: {
        current: currentSummary.income.total,
        previous: previousSummary.income.total,
        percentage: calculateChange(currentSummary.income.total, previousSummary.income.total)
      },
      expense: {
        current: currentSummary.expense.total,
        previous: previousSummary.expense.total,
        percentage: calculateChange(currentSummary.expense.total, previousSummary.expense.total)
      },
      net: {
        current: currentSummary.net,
        previous: previousSummary.net,
        percentage: previousSummary.net !== 0 ? ((currentSummary.net - previousSummary.net) / Math.abs(previousSummary.net) * 100).toFixed(1) : (currentSummary.net > 0 ? 100.0 : 0.0)
      }
    };

    const expenseBreakdown = await Transaction.getCategoryAnalytics(req.user._id, { startDate, endDate, type: 'expense' });
    const topExpenseCategories = expenseBreakdown.slice(0, 5).map(item => ({ category: item._id, total: item.total }));
    
    const incomeBreakdown = await Transaction.getCategoryAnalytics(req.user._id, { startDate, endDate, type: 'income' });
    const topIncomeCategories = incomeBreakdown.slice(0, 5).map(item => ({ category: item._id, total: item.total }));

    res.json({ trends, topExpenseCategories, topIncomeCategories });
  } catch (error) {
    console.error('Get trends analytics error:', error);
    res.status(500).json({ error: 'Failed to get trends analytics' });
  }
});


router.get('/insights', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summary = await Transaction.getSummary(req.user._id, { startDate, endDate });
    const categoryBreakdown = await Transaction.getCategoryAnalytics(req.user._id, { startDate, endDate, type: 'expense' });

    const insights = [];

    if (summary.net < 0) {
      insights.push({
        type: 'warning',
        title: 'Expenses Exceed Income',
        message: `You spent ₹${Math.abs(summary.net).toFixed(2)} more than you earned. Review spending to improve your balance.`,
      });
    } else {
       insights.push({
        type: 'positive',
        title: 'Positive Net Income',
        message: `Great job! You saved ₹${summary.net.toFixed(2)} this period.`,
      });
    }

    if (categoryBreakdown.length > 0) {
      const topCategory = categoryBreakdown[0];
      if(summary.expense.total > 0){
        const percentage = (topCategory.total / summary.expense.total * 100);
        if (percentage > 25) {
          insights.push({
            type: 'info',
            title: 'High Spending Category',
            message: `Your spending on '${topCategory._id}' is ${percentage.toFixed(0)}% of your total expenses.`,
          });
        }
      }
    }

    if (summary.income.total > 0) {
      const savingsRate = (summary.net / summary.income.total * 100);
      if (savingsRate < 10) {
        insights.push({
          type: 'warning',
          title: 'Low Savings Rate',
          message: `Your savings rate is ${savingsRate.toFixed(1)}%. Aiming for 15-20% can build a stronger financial future.`,
        });
      }
    }

    res.json({ insights });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});


router.get('/export', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Date range is required for export' });
    }

    const summary = await Transaction.getSummary(req.user._id, { startDate, endDate });
    const categoryBreakdown = await Transaction.getCategoryAnalytics(req.user._id, { startDate, endDate });
    
    const exportData = { summary, categoryBreakdown };

    if (format === 'csv') {
      const csvData = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${startDate}-to-${endDate}.csv"`);
      res.send(csvData);
    } else {
      res.json(exportData);
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  const lines = [];
  lines.push('SUMMARY');
  lines.push('Category,Count,Total');
  lines.push(`Income,${data.summary.income.count},${data.summary.income.total}`);
  lines.push(`Expense,${data.summary.expense.count},${data.summary.expense.total}`);
  lines.push(`Net,,${data.summary.net}`);
  lines.push('');
  
  lines.push('CATEGORY BREAKDOWN');
  lines.push('Category,Count,Total,Average');
  data.categoryBreakdown.forEach(item => {
    lines.push(`"${item._id}",${item.count},${item.total},${item.avgAmount.toFixed(2)}`);
  });
  
  return lines.join('\n');
}

module.exports = router;