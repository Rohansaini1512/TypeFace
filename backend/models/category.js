const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense'],
    default: 'expense'
  },
  color: {
    type: String,
    default: '#007bff',
    match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique category names per user and type
categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

// Static method to get default categories
categorySchema.statics.getDefaultCategories = function() {
  return [
    // Income categories
    { name: 'Salary', type: 'income', color: '#28a745' },
    { name: 'Freelance', type: 'income', color: '#20c997' },
    { name: 'Investment', type: 'income', color: '#17a2b8' },
    { name: 'Other Income', type: 'income', color: '#6f42c1' },
    
    // Expense categories
    { name: 'Food & Dining', type: 'expense', color: '#dc3545' },
    { name: 'Transportation', type: 'expense', color: '#fd7e14' },
    { name: 'Shopping', type: 'expense', color: '#e83e8c' },
    { name: 'Entertainment', type: 'expense', color: '#6f42c1' },
    { name: 'Bills & Utilities', type: 'expense', color: '#ffc107' },
    { name: 'Healthcare', type: 'expense', color: '#20c997' },
    { name: 'Education', type: 'expense', color: '#17a2b8' },
    { name: 'Travel', type: 'expense', color: '#fd7e14' },
    { name: 'Other Expenses', type: 'expense', color: '#6c757d' }
  ];
};

// Static method to create default categories for a user
categorySchema.statics.createDefaultCategories = async function(userId) {
  const defaultCategories = this.getDefaultCategories();
  const categories = defaultCategories.map(cat => ({
    ...cat,
    userId
  }));
  
  try {
    await this.insertMany(categories, { ordered: false });
  } catch (error) {
    // Ignore duplicate key errors
    if (error.code !== 11000) {
      throw error;
    }
  }
};

module.exports = mongoose.model('Category', categorySchema); 