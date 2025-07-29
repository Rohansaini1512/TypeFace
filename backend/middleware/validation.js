const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input data',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// --- AUTH VALIDATORS ---
const validateRegistration = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateProfileUpdate = [
    body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    handleValidationErrors
];

const validatePasswordChange = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Password confirmation does not match new password');
        }
        return true;
    }),
    handleValidationErrors
];

// --- TRANSACTION VALIDATORS ---
const validateTransaction = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be either "income" or "expense"'),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('date').isISO8601().toDate().withMessage('Date must be a valid ISO 8601 date (YYYY-MM-DD)'),
  handleValidationErrors
];

const validateTransactionUpdate = [
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('type').optional().isIn(['income', 'expense']).withMessage('Type must be either "income" or "expense"'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty').isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('date').optional().isISO8601().toDate().withMessage('Date must be a valid ISO 8601 date (YYYY-MM-DD)'),
  handleValidationErrors
];

const validateTransactionId = [
  // FIX: Changed from .isInt() to .isMongoId() to validate MongoDB ObjectIDs
  param('id')
    .isMongoId()
    .withMessage('Transaction ID must be a valid MongoDB ObjectID'),
  handleValidationErrors
];

const validateTransactionQuery = [
  query('type').optional().isIn(['income', 'expense']).withMessage('Type must be either "income" or "expense"'),
  query('category').optional().trim().isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'), // Changed from offset
  query('sortBy').optional().isIn(['date', 'amount', 'createdAt', 'category']).withMessage('Sort by must be one of: date, amount, createdAt, category'),
  // FIX: Added .toUpperCase() to convert 'desc' to 'DESC' before validation
  query('sortOrder')
    .optional()
    .toUpperCase()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be either ASC or DESC'),
  handleValidationErrors
];

// --- CATEGORY VALIDATORS ---
const validateCategory = [
    body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 50 }).withMessage('Category name must be less than 50 characters'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be either "income" or "expense"'),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color code'),
    handleValidationErrors
];

const validateCategoryId = [
    // FIX: Changed from .isInt() to .isMongoId() to validate MongoDB ObjectIDs
    param('id')
        .isMongoId()
        .withMessage('Category ID must be a valid MongoDB ObjectID'),
    handleValidationErrors
];

// --- OTHER VALIDATORS ---
const validateAnalyticsQuery = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Group by must be one of: day, week, month'),
  handleValidationErrors
];

const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    return res.status(400).json({
      error: 'Invalid date range',
      message: 'End date must be after start date'
    });
  }
  next();
};

const validateFileUpload = [
  body('type').isIn(['receipt', 'statement']).withMessage('Upload type must be either "receipt" or "statement"'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateTransaction,
  validateTransactionUpdate,
  validateTransactionId,
  validateTransactionQuery,
  validateCategory,
  validateCategoryId,
  validateAnalyticsQuery,
  validateDateRange,
  validateFileUpload
};