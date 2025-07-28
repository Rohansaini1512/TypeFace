const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/transaction');
const Category = require('../models/category');
const OCRService = require('../services/ocrService');
const PDFService = require('../services/pdfService');
const { authenticateToken } = require('../middleware/auth');
const { validateFileUpload } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const uploadType = req.body.type || req.query.type;
  
  if (uploadType === 'receipt') {
    // Allow image files for receipts
    if (OCRService.isValidImageFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files (JPG, PNG, BMP, TIFF) are allowed for receipts.'), false);
    }
  } else if (uploadType === 'statement') {
    // Allow PDF files for statements
    if (PDFService.isValidPDFFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed for statements.'), false);
    }
  } else {
    cb(new Error('Invalid upload type. Must be either "receipt" or "statement".'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

/**
 * @route   POST /api/upload/receipt
 * @desc    Upload and process receipt image
 * @access  Private
 */
router.post('/receipt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a receipt image to upload'
      });
    }

    console.log(`Processing receipt: ${req.file.filename}`);

    // Process the receipt using OCR
    const result = await OCRService.processReceipt(req.file.path);

    if (!result.success) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        error: 'Receipt processing failed',
        message: result.error,
        supportedFormats: OCRService.getSupportedFormats()
      });
    }

    const { data, rawText } = result;

    // Create transaction from extracted data
    let transaction = null;
    if (data.amount && data.category) {
      // Check if category exists for this user
      const categoryExists = await Category.findOne({
        name: data.category,
        type: 'expense',
        userId: req.user._id
      });
      
      if (!categoryExists) {
        await Category.create({
          name: data.category,
          type: 'expense',
          userId: req.user._id
        });
      }

      const transaction = new Transaction({
        userId: req.user._id,
        amount: data.amount,
        type: 'expense',
        category: data.category,
        description: data.description || 'Receipt upload',
        date: data.date ? new Date(data.date) : new Date(),
        receiptUrl: `/uploads/${req.file.filename}`
      });

      await transaction.save();
    }

    res.json({
      message: 'Receipt processed successfully',
      extractedData: data,
      transaction: transaction,
      confidence: data.confidence,
      rawText: rawText.substring(0, 500) + '...', // First 500 chars for debugging
      fileUrl: `/uploads/${req.file.filename}`
    });

  } catch (error) {
    console.error('Receipt upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Receipt upload failed',
      message: error.message || 'An error occurred while processing the receipt',
      supportedFormats: OCRService.getSupportedFormats()
    });
  }
});

/**
 * @route   POST /api/upload/statement
 * @desc    Upload and process PDF statement
 * @access  Private
 */
router.post('/statement', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a PDF statement to upload'
      });
    }

    console.log(`Processing statement: ${req.file.filename}`);

    // Process the PDF statement
    const result = await PDFService.processStatement(req.file.path, req.user._id);

    if (!result.success) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        error: 'Statement processing failed',
        message: result.error,
        supportedFormats: PDFService.getSupportedFormats()
      });
    }

    const { transactions, count, rawText } = result;

    // Insert transactions into database
    let insertedCount = 0;
    if (transactions.length > 0) {
      const insertResult = await Transaction.insertMany(transactions);
      insertedCount = insertResult.length;
    }

    res.json({
      message: 'Statement processed successfully',
      totalTransactions: count,
      insertedTransactions: insertedCount,
      skippedTransactions: count - insertedCount,
      transactions: transactions.slice(0, 10), // Return first 10 for preview
      fileUrl: `/uploads/${req.file.filename}`,
      rawText: rawText
    });

  } catch (error) {
    console.error('Statement upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Statement upload failed',
      message: error.message || 'An error occurred while processing the statement',
      supportedFormats: PDFService.getSupportedFormats()
    });
  }
});

/**
 * @route   GET /api/upload/supported-formats
 * @desc    Get supported file formats for uploads
 * @access  Private
 */
router.get('/supported-formats', (req, res) => {
  res.json({
    receipt: {
      description: 'Receipt images for OCR processing',
      formats: OCRService.getSupportedFormats(),
      maxSize: '10MB'
    },
    statement: {
      description: 'PDF bank statements for transaction import',
      formats: PDFService.getSupportedFormats(),
      maxSize: '10MB'
    }
  });
});

/**
 * @route   DELETE /api/upload/:filename
 * @desc    Delete uploaded file
 * @access  Private
 */
router.delete('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file was not found'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: 'An error occurred while deleting the file'
    });
  }
});

/**
 * @route   GET /api/upload/files
 * @desc    Get list of uploaded files for user
 * @access  Private
 */
router.get('/files', async (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const fileList = [];

    for (const filename of files) {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      
      fileList.push({
        filename,
        size: stats.size,
        uploadedAt: stats.birthtime,
        url: `/uploads/${filename}`
      });
    }

    // Sort by upload date (newest first)
    fileList.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ files: fileList });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      error: 'Failed to get files',
      message: 'An error occurred while retrieving the file list'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size exceeds the 10MB limit'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Only one file can be uploaded at a time'
      });
    }
  }

  if (error.message) {
    return res.status(400).json({
      error: 'Upload error',
      message: error.message
    });
  }

  next(error);
});

module.exports = router; 