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
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  receiptUrl: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

transactionSchema.virtual('formattedAmount').get(function() {
  return this.type === 'income' ? this.amount : -this.amount;
});

transactionSchema.statics.findByUser = async function(userId, page = 1, limit = 10, search = '') {
  const skip = (page - 1) * limit;
  const query = { userId };
  
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];
  }
  
  const transactions = await this.find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);
    
  const total = await this.countDocuments(query);
  
  return {
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

transactionSchema.statics.getAnalytics = async function(userId, startDate, endDate) {
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ];

  const results = await this.aggregate(pipeline);
  
  const analytics = {
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 }
  };

  results.forEach(result => {
    analytics[result._id] = {
      total: result.total,
      count: result.count
    };
  });

  return analytics;
};

transactionSchema.statics.getTimeline = async function(userId, startDate, endDate) {
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ];

  return await this.aggregate(pipeline);
};

transactionSchema.statics.getSummary = async function(userId) {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ];

  const results = await this.aggregate(pipeline);
  
  const summary = {
    totalIncome: 0,
    totalExpenses: 0,
    totalTransactions: 0,
    balance: 0
  };

  results.forEach(result => {
    if (result._id === 'income') {
      summary.totalIncome = result.total;
      summary.totalTransactions += result.count;
    } else if (result._id === 'expense') {
      summary.totalExpenses = result.total;
      summary.totalTransactions += result.count;
    }
  });

  summary.balance = summary.totalIncome - summary.totalExpenses;
  
  return summary;
};

module.exports = mongoose.model('Transaction', transactionSchema); 