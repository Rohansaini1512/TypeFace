const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/transaction');
const Category = require('../models/category');
const OCRService = require('../services/ocrService');
const PDFService = require('../services/pdfService'); // Still used for text extraction
const AIStatementParserService = require('../services/aiStatementParser'); // The new AI service
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- Multer Configurations ---

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Multer config for image receipts
const uploadReceipt = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (OCRService.isValidImageFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Multer config for PDF statements
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


// --- Route Handlers ---

/**
 * @route   POST /api/upload/receipt
 * @desc    Upload and process an image receipt using OCR.
 * @access  Private
 */
router.post('/receipt', uploadReceipt.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const filePath = req.file.path;

  try {
    const result = await OCRService.processReceipt(filePath);
    if (!result.success) {
      return res.status(400).json({ error: 'Receipt processing failed', message: result.error });
    }
    // ... logic to save transaction from OCR result ...
    res.json({ message: 'Receipt processed successfully', ...result });
  } catch (error) {
    console.error('Receipt upload error:', error);
    res.status(500).json({ error: 'Receipt upload failed', message: error.message });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

/**
 * @route   POST /api/upload/statement
 * @desc    Upload and process a PDF statement using the AI Parser.
 * @access  Private
 */
router.post('/statement', uploadStatement.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded', message: 'Please select a file.' });
  }
  const filePath = req.file.path;

  try {
    // Step 1: Extract raw text from the PDF.
    const rawText = await PDFService.extractText(filePath);
    if (!rawText || rawText.trim().length < 50) { // Check for a reasonable amount of text
      throw new Error('No text could be extracted from the PDF, or the document is empty.');
    }

    // Step 2: Send the raw text to the AI for intelligent parsing.
    const transactionsToInsert = await AIStatementParserService.parseWithAI(rawText, req.user._id);
    
    let insertedCount = 0;
    if (transactionsToInsert.length > 0) {
      // Step 3: Insert the clean, structured data into the database.
      const result = await Transaction.insertMany(transactionsToInsert, { ordered: false });
      insertedCount = result.length;
    }

    res.json({
      message: 'Statement processed successfully with AI',
      totalTransactions: transactionsToInsert.length,
      insertedTransactions: insertedCount,
      skippedTransactions: transactionsToInsert.length - insertedCount,
      transactions: transactionsToInsert.slice(0, 10), // Return a preview for the UI
      fileUrl: `/uploads/${req.file.filename}`,
    });

  } catch (error) {
    console.error('AI Statement processing error:', error);
    res.status(500).json({
      error: 'Statement processing failed',
      message: error.message || 'An unexpected error occurred.',
    });
  } finally {
    // Step 4: Always clean up the uploaded file.
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

/**
 * @route   GET /api/upload/supported-formats
 * @desc    Get supported file formats for uploads.
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

// Multer error handling middleware
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: 'File upload error', message: error.message });
    }
    if (error) {
        return res.status(400).json({ error: 'Invalid file', message: error.message });
    }
    next();
});

module.exports = router;