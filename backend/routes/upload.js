const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/transaction');
const Category = require('../models/category');
const PDFService = require('../services/pdfService'); // Kept for initial text extraction
const AIStatementParserService = require('../services/aiStatementParser');
const AIReceiptParserService = require('../services/aiReceiptParser');
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

// Helper to check for valid image extensions
const isValidImageFile = (filename) => {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    return validExtensions.includes(path.extname(filename).toLowerCase());
};

// Multer config for image receipts
const uploadReceipt = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (isValidImageFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, or WebP images are allowed.'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});



router.post('/receipt', uploadReceipt.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded', message: 'Please select an image file.' });
  }
  const filePath = req.file.path;

  try {
    if (typeof AIReceiptParserService.parseWithAI !== 'function') {
      console.error("CRITICAL ERROR: AIReceiptParserService.parseWithAI is not a function. This is likely caused by an error during the service's initialization (e.g., missing GEMINI_API_KEY in .env).");
      throw new Error("AI Receipt Parser service is not available. Please check the server logs for more details.");
    }

    // Call the AI Receipt Parser service
    const result = await AIReceiptParserService.parseWithAI(filePath);

    if (!result.success || !result.data.totalAmount) {
      return res.status(400).json({ 
          error: 'AI processing failed', 
          message: 'The AI could not extract a valid total amount from the receipt.' 
      });
    }

    const { totalAmount, transactionDate, description } = result.data;
    
    // Create a new transaction from the AI's structured response
    const transaction = new Transaction({
      userId: req.user._id,
      amount: totalAmount,
      type: 'expense', // Receipts are always expenses
      category: AIStatementParserService.categorizeTransaction(description, true), // Reuse categorization logic
      description: description || 'Transaction from receipt',
      date: transactionDate ? new Date(transactionDate) : new Date(),
      receiptUrl: `/uploads/${req.file.filename}`
    });

    await transaction.save();

    res.json({
      message: 'Receipt processed successfully with AI',
      extractedData: result.data,
      transaction: transaction,
      fileUrl: `/uploads/${req.file.filename}`
    });

  } catch (error) {
    console.error('AI Receipt processing error:', error);
    res.status(500).json({ error: 'Receipt upload failed', message: error.message });
  } finally {
    // We keep the receipt file because the transaction links to it via receiptUrl
    // A separate cleanup job could be implemented to delete old files.
  }
});

router.post('/statement', uploadStatement.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded', message: 'Please select a PDF file.' });
  }
  const filePath = req.file.path;

  try {
    // FIX: Add a similar check for the statement parser for robustness.
    if (typeof AIStatementParserService.parseWithAI !== 'function') {
      console.error("CRITICAL ERROR: AIStatementParserService.parseWithAI is not a function. This is likely caused by an error during the service's initialization (e.g., missing GEMINI_API_KEY in .env).");
      throw new Error("AI Statement Parser service is not available. Please check the server logs for more details.");
    }

    // Step 1: Extract raw text from the PDF.
    const rawText = await PDFService.extractText(filePath);
    if (!rawText || rawText.trim().length < 50) {
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
    });

  } catch (error) {
    console.error('AI Statement processing error:', error);
    res.status(500).json({
      error: 'Statement processing failed',
      message: error.message || 'An unexpected error occurred.',
    });
  } finally {
    // Step 4: Always clean up the uploaded PDF file after processing.
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});


router.get('/supported-formats', (req, res) => {
  res.json({
    receipt: {
      description: 'Receipt images (JPG, PNG, WebP)',
      formats: ['.jpg', '.jpeg', '.png', '.webp'],
      maxSize: '10MB'
    },
    statement: {
      description: 'PDF bank statements',
      formats: ['.pdf'],
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