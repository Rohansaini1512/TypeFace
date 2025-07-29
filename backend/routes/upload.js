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

const router = express.Router();

router.use(authenticateToken);

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Multer configuration for image receipts
const uploadReceipt = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (OCRService.isValidImageFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files (JPG, PNG, BMP, TIFF) are allowed.'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Multer configuration for PDF statements
const uploadStatement = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (PDFService.isValidPDFFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * @route   POST /api/upload/receipt
 * @desc    Upload and process receipt image
 * @access  Private
 */
router.post('/receipt', uploadReceipt.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a receipt image to upload'
      });
    }

    const result = await OCRService.processReceipt(req.file.path);

    if (!result.success) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Receipt processing failed',
        message: result.error,
      });
    }

    const { data, rawText } = result;
    let transaction = null;

    if (data.amount && data.category) {
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

      transaction = new Transaction({
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
      rawText: rawText.substring(0, 500) + '...',
      fileUrl: `/uploads/${req.file.filename}`
    });

  } catch (error) {
    console.error('Receipt upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Receipt upload failed',
      message: error.message || 'An error occurred while processing the receipt',
    });
  }
});

/**
 * @route   POST /api/upload/statement
 * @desc    Upload and process PDF statement
 * @access  Private
 */
router.post('/statement', uploadStatement.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a PDF statement to upload'
      });
    }

    const result = await PDFService.processStatement(req.file.path, req.user._id);

    if (!result.success) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Statement processing failed',
        message: result.error,
      });
    }

    const { transactions, count, rawText } = result;

    // FIX: Transform the data to match the Mongoose schema (snake_case to camelCase)
    const transactionsToInsert = transactions.map(tx => ({
        userId: tx.user_id,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        description: tx.description,
        date: tx.date,
        receiptUrl: tx.receipt_url,
    }));

    let insertedCount = 0;
    if (transactionsToInsert.length > 0) {
      const insertResult = await Transaction.insertMany(transactionsToInsert, { ordered: false })
        .catch(err => {
            console.error("Database InsertMany Error:", err.message);
            // Return an object that looks like an error result from insertMany
            return { length: 0 };
        });
      // The result of insertMany is an array of documents, so .length is the count
      insertedCount = insertResult.length;
    }

    res.json({
      message: 'Statement processed successfully',
      totalTransactions: count,
      insertedTransactions: insertedCount,
      skippedTransactions: count - insertedCount,
      transactions: transactions.slice(0, 10), // Show preview of original parsed data
      fileUrl: `/uploads/${req.file.filename}`,
      rawText: rawText
    });

  } catch (error) {
    console.error('Statement upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Statement upload failed',
      message: error.message || 'An error occurred while processing the statement',
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

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file was not found'
      });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: 'An error occurred while deleting the file'
    });
  }
});

// Multer error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large', message: 'File size exceeds the 10MB limit' });
    }
  }
  if (error.message) {
    return res.status(400).json({ error: 'Upload error', message: error.message });
  }
  next(error);
});

module.exports = router;