const express = require('express');
const Transaction = require('../models/transaction');
const Category = require('../models/category');
const { authenticateToken } = require('../middleware/auth');
const {
  validateTransaction,
  validateTransactionUpdate,
  validateTransactionId,
  validateTransactionQuery,
  validateDateRange
} = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes in this file
router.use(authenticateToken);

// --- Specific routes must be defined BEFORE dynamic routes like '/:id' ---

/**
 * @route   GET /api/transactions/summary
 * @desc    Get transaction summary for user within a date range
 * @access  Private
 */
router.get('/summary', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filters = { startDate, endDate };
    const summary = await Transaction.getSummary(req.user._id, filters);
    res.json(summary);
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      error: 'Failed to get summary',
      message: 'An error occurred while retrieving the summary'
    });
  }
});

/**
 * @route   GET /api/transactions/categories
 * @desc    Get all user categories with their transaction counts
 * @access  Private
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort({ name: 1 });

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Transaction.countDocuments({
          userId: req.user._id,
          category: category.name,
          type: category.type
        });

        return {
          ...category.toObject(),
          id: category._id,
          transactionCount: count
        };
      })
    );

    res.json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to get categories',
      message: 'An error occurred while retrieving categories'
    });
  }
});

/**
 * @route   POST /api/transactions/bulk
 * @desc    Bulk insert multiple transactions
 * @access  Private
 */
router.post('/bulk', async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        error: 'Invalid transactions data',
        message: 'Transactions must be a non-empty array'
      });
    }

    const validTransactions = [];
    for (const transaction of transactions) {
      const { amount, type, category, description, date } = transaction;
      if (!amount || !type || !category || !date) continue; // Skip malformed

      const categoryExists = await Category.findOne({
        name: category,
        type,
        userId: req.user._id
      });

      if (!categoryExists) {
        await Category.create({ name: category, type, userId: req.user._id });
      }

      validTransactions.push({
        userId: req.user._id,
        amount: parseFloat(amount),
        type,
        category,
        description: description || '',
        date: new Date(date),
      });
    }

    if (validTransactions.length === 0) {
      return res.status(400).json({
        error: 'No valid transactions',
        message: 'No valid transactions found in the provided data'
      });
    }

    const result = await Transaction.insertMany(validTransactions);

    res.status(201).json({
      message: 'Bulk transactions created successfully',
      insertedCount: result.length
    });
  } catch (error) {
    console.error('Bulk insert error:', error);
    res.status(500).json({
      error: 'Failed to create bulk transactions',
      message: 'An error occurred during bulk insertion'
    });
  }
});


// --- General and dynamic routes ---

/**
 * @route   GET /api/transactions
 * @desc    Get user transactions with filtering, sorting, and pagination
 * @access  Private
 */
router.get('/', validateTransactionQuery, validateDateRange, async (req, res) => {
  try {
    // FIX: Normalize the sortOrder to uppercase to pass validation.
    if (req.query.sortOrder) {
      req.query.sortOrder = req.query.sortOrder.toUpperCase();
    }

    const result = await Transaction.findByUser(req.user._id, req.query);
    res.json(result);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to get transactions',
      message: 'An error occurred while retrieving your transactions'
    });
  }
});

/**
 * @route   GET /api/transactions/:id
 * @desc    Get a single transaction by its ID
 * @access  Private
 */
router.get('/:id', validateTransactionId, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'The requested transaction was not found'
      });
    }
    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      error: 'Failed to get transaction',
      message: 'An error occurred while retrieving the transaction'
    });
  }
});

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction
 * @access  Private
 */
router.post('/', validateTransaction, async (req, res) => {
  try {
    const { amount, type, category, description, date, receiptUrl } = req.body;

    const categoryExists = await Category.findOne({
      name: category,
      type,
      userId: req.user._id
    });
    if (!categoryExists) {
      await Category.create({ name: category, type, userId: req.user._id });
    }

    const transaction = new Transaction({
      userId: req.user._id,
      amount: parseFloat(amount),
      type,
      category,
      description: description || '',
      date: new Date(date),
      receiptUrl: receiptUrl || null
    });

    await transaction.save();
    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      error: 'Failed to create transaction',
      message: 'An error occurred while creating the transaction'
    });
  }
});

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update an existing transaction
 * @access  Private
 */
router.put('/:id', validateTransactionId, validateTransactionUpdate, async (req, res) => {
  try {
    const { amount, type, category, description, date, receiptUrl } = req.body;
    const updates = { amount, type, category, description, date, receiptUrl };

    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    if (updates.date) updates.date = new Date(updates.date);

    const updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      message: 'Transaction updated successfully',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      error: 'Failed to update transaction',
      message: 'An error occurred while updating the transaction'
    });
  }
});

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete a transaction
 * @access  Private
 */
router.delete('/:id', validateTransactionId, async (req, res) => {
  try {
    const deletedTransaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!deletedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      error: 'Failed to delete transaction',
      message: 'An error occurred while deleting the transaction'
    });
  }
});

module.exports = router;