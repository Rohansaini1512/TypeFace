const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be a positive number']
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Transaction type is required'],
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now,
    index: true
  },
  receiptUrl: {
    type: String,
    trim: true
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  },
  toObject: {
    virtuals: true
  }
});

transactionSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

transactionSchema.statics.findByUser = async function(userId, filters = {}) {
  const {
    page = 1,
    limit = 10,
    search = '',
    type,
    category,
    startDate,
    endDate,
    sortBy = 'date',
    sortOrder = 'desc'
  } = filters;

  const query = { userId };

  if (type) query.type = type;
  if (category) query.category = category;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) {
       const end = new Date(endDate);
       end.setHours(23, 59, 59, 999);
       query.date.$lte = end;
    }
  }
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    query.$or = [{ description: searchRegex }, { category: searchRegex }];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const transactions = await this.find(query).sort(sort).skip(skip).limit(parseInt(limit));
  const total = await this.countDocuments(query);

  return {
    transactions,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };
};

transactionSchema.statics.getSummary = async function(userId, filters = {}) {
  const { startDate, endDate } = filters;

  const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.date.$lte = end;
    }
  }

  const pipeline = [
    { $match: matchStage },
    {
      $facet: {
        incomeData: [
          { $match: { type: 'income' } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ],
        expenseData: [
          { $match: { type: 'expense' } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, average: { $avg: '$amount' } } }
        ]
      }
    },
    {
      $project: {
        income: { $arrayElemAt: ['$incomeData', 0] },
        expense: { $arrayElemAt: ['$expenseData', 0] }
      }
    },
    {
      $project: {
        income: {
          total: { $ifNull: ['$income.total', 0] },
          count: { $ifNull: ['$income.count', 0] }
        },
        expense: {
          total: { $ifNull: ['$expense.total', 0] },
          count: { $ifNull: ['$expense.count', 0] },
          average: { $ifNull: ['$expense.average', 0] }
        },
        net: { $subtract: [{ $ifNull: ['$income.total', 0] }, { $ifNull: ['$expense.total', 0] }] }
      }
    }
  ];

  const results = await this.aggregate(pipeline);
  return results[0] || {
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0, average: 0 },
    net: 0
  };
};

// FIX: Added the missing function for category analytics
transactionSchema.statics.getCategoryAnalytics = async function(userId, filters = {}) {
  const { startDate, endDate, type } = filters;

  const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.date.$lte = end;
    }
  }
  if (type) {
    matchStage.type = type;
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    { $sort: { total: -1 } }
  ];

  return this.aggregate(pipeline);
};


module.exports = mongoose.model('Transaction', transactionSchema);