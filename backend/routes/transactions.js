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

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/transactions
 * @desc    Get user transactions with filters and pagination
 * @access  Private
 */
router.get('/', validateTransactionQuery, validateDateRange, async (req, res) => {
  try {
    const {
      type,
      category,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      type,
      category,
      startDate,
      endDate,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: sortOrder.toLowerCase()
    };

    const result = await Transaction.findByUser(req.user._id, filters);

    res.json({
      transactions: result.transactions,
      pagination: result.pagination
    });
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
 * @desc    Get specific transaction by ID
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

    // Check if category exists for this user
    const categoryExists = await Category.findOne({
      name: category,
      type,
      userId: req.user._id
    });
    
    if (!categoryExists) {
      // Create category if it doesn't exist
      await Category.create({
        name: category,
        type,
        userId: req.user._id
      });
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
 * @desc    Update a transaction
 * @access  Private
 */
router.put('/:id', validateTransactionId, validateTransactionUpdate, async (req, res) => {
  try {
    const updates = {};
    const { amount, type, category, description, date, receiptUrl } = req.body;

    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (type !== undefined) updates.type = type;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = new Date(date);
    if (receiptUrl !== undefined) updates.receiptUrl = receiptUrl;

    // Check if new category exists
    if (category) {
      const categoryExists = await Category.findOne({
        name: category,
        type: type || 'expense',
        userId: req.user._id
      });
      
      if (!categoryExists) {
        await Category.create({
          name: category,
          type: type || 'expense',
          userId: req.user._id
        });
      }
    }

    const updatedTransaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'The requested transaction was not found'
      });
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
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'The requested transaction was not found'
      });
    }

    res.json({
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      error: 'Failed to delete transaction',
      message: 'An error occurred while deleting the transaction'
    });
  }
});

/**
 * @route   GET /api/transactions/summary
 * @desc    Get transaction summary for user
 * @access  Private
 */
router.get('/summary', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters = { startDate, endDate };
    const summary = await Transaction.getSummary(req.user._id, filters);

    res.json({ summary });
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
 * @desc    Get categories with transaction counts
 * @access  Private
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort({ name: 1 });
    
    // Get transaction counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Transaction.countDocuments({
          userId: req.user._id,
          category: category.name,
          type: category.type
        });
        
        return {
          ...category.toObject(),
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
 * @desc    Bulk insert transactions
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

    // Validate and prepare transactions
    const validTransactions = [];
    for (const transaction of transactions) {
      const { amount, type, category, description, date } = transaction;
      
      if (!amount || !type || !category || !date) {
        continue; // Skip invalid transactions
      }

      // Check if category exists
      const categoryExists = await Category.findOne({
        name: category,
        type,
        userId: req.user._id
      });
      
      if (!categoryExists) {
        await Category.create({
          name: category,
          type,
          userId: req.user._id
        });
      }

      validTransactions.push({
        userId: req.user._id,
        amount: parseFloat(amount),
        type,
        category,
        description: description || '',
        date: new Date(date),
        receiptUrl: null
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
      inserted: result.length,
      total: transactions.length,
      valid: validTransactions.length
    });
  } catch (error) {
    console.error('Bulk insert error:', error);
    res.status(500).json({
      error: 'Failed to create bulk transactions',
      message: 'An error occurred while creating the transactions'
    });
  }
});

module.exports = router; 