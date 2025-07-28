const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * PDF Service for parsing transaction statements and bank statements
 */
class PDFService {
  /**
   * Extract text from PDF file
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Promise<string>} Extracted text
   */
  static async extractText(pdfPath) {
    try {
      console.log(`Starting PDF text extraction for: ${pdfPath}`);
      
      // Read PDF file
      const dataBuffer = fs.readFileSync(pdfPath);
      
      // Parse PDF
      const data = await pdfParse(dataBuffer);
      
      console.log('PDF text extraction completed successfully');
      return data.text;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Parse transaction statement text to extract transaction data
   * @param {string} text - Raw PDF text
   * @param {number} userId - User ID for the transactions
   * @returns {Promise<Array>} Array of parsed transactions
   */
  static async parseTransactionStatement(text, userId) {
    try {
      console.log('Parsing transaction statement...');
      
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const transactions = [];

      // Common patterns for transaction statements
      const patterns = [
        // Pattern: Date Description Amount
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\-\+]?\$?\d+\.?\d*)/i,
        // Pattern: Date Amount Description
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+([\-\+]?\$?\d+\.?\d*)\s+(.+)/i,
        // Pattern: Description Date Amount
        /(.+?)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+([\-\+]?\$?\d+\.?\d*)/i,
        // Pattern with different date formats
        /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(.+?)\s+([\-\+]?\$?\d+\.?\d*)/i
      ];

      for (const line of lines) {
        // Skip header lines and summary lines
        if (this.isHeaderLine(line) || this.isSummaryLine(line)) {
          continue;
        }

        let transaction = null;

        // Try each pattern
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            transaction = this.parseTransactionFromMatch(match, userId);
            if (transaction) {
              break;
            }
          }
        }

        // If no pattern matched, try to extract manually
        if (!transaction) {
          transaction = this.parseTransactionManually(line, userId);
        }

        if (transaction) {
          transactions.push(transaction);
        }
      }

      console.log(`Parsed ${transactions.length} transactions from statement`);
      return transactions;
    } catch (error) {
      console.error('Transaction statement parsing failed:', error);
      throw new Error(`Failed to parse transaction statement: ${error.message}`);
    }
  }

  /**
   * Parse transaction from regex match
   * @param {Array} match - Regex match result
   * @param {number} userId - User ID
   * @returns {Object|null} Parsed transaction or null
   */
  static parseTransactionFromMatch(match, userId) {
    try {
      let date, description, amount;

      // Determine which group is which based on the pattern
      if (match[1].match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$|^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/)) {
        // First group is date
        date = this.parseDate(match[1]);
        if (match[2].match(/[\-\+]?\$?\d+\.?\d*/)) {
          // Second group is amount
          amount = this.parseAmount(match[2]);
          description = match[3];
        } else {
          // Second group is description
          description = match[2];
          amount = this.parseAmount(match[3]);
        }
      } else {
        // First group is description
        description = match[1];
        date = this.parseDate(match[2]);
        amount = this.parseAmount(match[3]);
      }

      if (!date || !amount || !description) {
        return null;
      }

      return {
        user_id: userId,
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        category: this.categorizeTransaction(description),
        description: description.trim(),
        date: date,
        receipt_url: null
      };
    } catch (error) {
      console.error('Error parsing transaction from match:', error);
      return null;
    }
  }

  /**
   * Parse transaction manually from line
   * @param {string} line - Line of text
   * @param {number} userId - User ID
   * @returns {Object|null} Parsed transaction or null
   */
  static parseTransactionManually(line, userId) {
    try {
      // Look for amount patterns
      const amountMatch = line.match(/[\-\+]?\$?\d+\.?\d*/);
      if (!amountMatch) {
        return null;
      }

      const amount = this.parseAmount(amountMatch[0]);
      if (!amount) {
        return null;
      }

      // Look for date patterns
      const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/);
      const date = dateMatch ? this.parseDate(dateMatch[0]) : new Date().toISOString().split('T')[0];

      // Extract description (everything except amount and date)
      let description = line
        .replace(amountMatch[0], '')
        .replace(dateMatch ? dateMatch[0] : '', '')
        .replace(/[^\w\s]/g, ' ')
        .trim();

      if (!description) {
        description = 'Imported transaction';
      }

      return {
        user_id: userId,
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        category: this.categorizeTransaction(description),
        description: description,
        date: date,
        receipt_url: null
      };
    } catch (error) {
      console.error('Error parsing transaction manually:', error);
      return null;
    }
  }

  /**
   * Parse date string to ISO format
   * @param {string} dateStr - Date string
   * @returns {string} ISO date string (YYYY-MM-DD)
   */
  static parseDate(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse amount string to number
   * @param {string} amountStr - Amount string
   * @returns {number|null} Parsed amount or null
   */
  static parseAmount(amountStr) {
    try {
      // Remove currency symbols and commas
      const cleanAmount = amountStr.replace(/[$,]/g, '');
      const amount = parseFloat(cleanAmount);
      
      if (isNaN(amount)) {
        return null;
      }
      
      return amount;
    } catch (error) {
      return null;
    }
  }

  /**
   * Categorize transaction based on description
   * @param {string} description - Transaction description
   * @returns {string} Category name
   */
  static categorizeTransaction(description) {
    const lowerDesc = description.toLowerCase();

    // Income categories
    if (lowerDesc.includes('salary') || lowerDesc.includes('payroll') || 
        lowerDesc.includes('deposit') || lowerDesc.includes('credit')) {
      return 'Salary';
    }

    if (lowerDesc.includes('freelance') || lowerDesc.includes('consulting') ||
        lowerDesc.includes('contract')) {
      return 'Freelance';
    }

    if (lowerDesc.includes('investment') || lowerDesc.includes('dividend') ||
        lowerDesc.includes('interest')) {
      return 'Investment';
    }

    // Expense categories
    if (lowerDesc.includes('restaurant') || lowerDesc.includes('cafe') ||
        lowerDesc.includes('food') || lowerDesc.includes('meal') ||
        lowerDesc.includes('grocery') || lowerDesc.includes('supermarket')) {
      return 'Food & Dining';
    }

    if (lowerDesc.includes('gas') || lowerDesc.includes('fuel') ||
        lowerDesc.includes('transport') || lowerDesc.includes('uber') ||
        lowerDesc.includes('lyft') || lowerDesc.includes('taxi')) {
      return 'Transportation';
    }

    if (lowerDesc.includes('shopping') || lowerDesc.includes('store') ||
        lowerDesc.includes('amazon') || lowerDesc.includes('walmart') ||
        lowerDesc.includes('target')) {
      return 'Shopping';
    }

    if (lowerDesc.includes('movie') || lowerDesc.includes('theater') ||
        lowerDesc.includes('entertainment') || lowerDesc.includes('netflix') ||
        lowerDesc.includes('spotify')) {
      return 'Entertainment';
    }

    if (lowerDesc.includes('electric') || lowerDesc.includes('water') ||
        lowerDesc.includes('utility') || lowerDesc.includes('internet') ||
        lowerDesc.includes('phone') || lowerDesc.includes('bill')) {
      return 'Bills & Utilities';
    }

    if (lowerDesc.includes('medical') || lowerDesc.includes('health') ||
        lowerDesc.includes('pharmacy') || lowerDesc.includes('doctor')) {
      return 'Healthcare';
    }

    if (lowerDesc.includes('education') || lowerDesc.includes('school') ||
        lowerDesc.includes('course') || lowerDesc.includes('training')) {
      return 'Education';
    }

    if (lowerDesc.includes('travel') || lowerDesc.includes('hotel') ||
        lowerDesc.includes('flight') || lowerDesc.includes('airline')) {
      return 'Travel';
    }

    // Default categories
    if (lowerDesc.includes('withdrawal') || lowerDesc.includes('debit')) {
      return 'Other Expenses';
    }

    if (lowerDesc.includes('deposit') || lowerDesc.includes('credit')) {
      return 'Other Income';
    }

    return 'Other Expenses';
  }

  /**
   * Check if line is a header line
   * @param {string} line - Line to check
   * @returns {boolean} True if header line
   */
  static isHeaderLine(line) {
    const headerKeywords = [
      'date', 'description', 'amount', 'balance', 'transaction',
      'account', 'statement', 'summary', 'total', 'debit', 'credit'
    ];
    
    const lowerLine = line.toLowerCase();
    return headerKeywords.some(keyword => lowerLine.includes(keyword));
  }

  /**
   * Check if line is a summary line
   * @param {string} line - Line to check
   * @returns {boolean} True if summary line
   */
  static isSummaryLine(line) {
    const summaryKeywords = [
      'total', 'balance', 'summary', 'ending balance', 'beginning balance',
      'previous balance', 'new balance', 'available balance'
    ];
    
    const lowerLine = line.toLowerCase();
    return summaryKeywords.some(keyword => lowerLine.includes(keyword));
  }

  /**
   * Process PDF statement and extract transactions
   * @param {string} pdfPath - Path to the PDF file
   * @param {number} userId - User ID for the transactions
   * @returns {Promise<Object>} Processing result
   */
  static async processStatement(pdfPath, userId) {
    try {
      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        throw new Error('PDF file not found');
      }

      // Extract text from PDF
      const text = await this.extractText(pdfPath);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF');
      }

      // Parse the extracted text
      const transactions = await this.parseTransactionStatement(text, userId);

      return {
        success: true,
        transactions: transactions,
        count: transactions.length,
        rawText: text.substring(0, 1000) + '...' // First 1000 chars for debugging
      };
    } catch (error) {
      console.error('PDF statement processing failed:', error);
      return {
        success: false,
        error: error.message,
        transactions: [],
        count: 0,
        rawText: null
      };
    }
  }

  /**
   * Validate PDF file
   * @param {string} filePath - Path to the file
   * @returns {boolean} True if valid PDF file
   */
  static isValidPDFFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.pdf';
  }

  /**
   * Get supported file formats
   * @returns {Array} Array of supported file extensions
   */
  static getSupportedFormats() {
    return ['.pdf'];
  }
}

module.exports = PDFService; 