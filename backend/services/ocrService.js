const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

/**
 * OCR Service for extracting text from receipt images
 */
class OCRService {
  /**
   * Extract text from image using Tesseract OCR
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<string>} Extracted text
   */
  static async extractText(imagePath) {
    try {
      console.log(`Starting OCR extraction for: ${imagePath}`);
      
      const result = await Tesseract.recognize(
        imagePath,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      console.log('OCR extraction completed successfully');
      return result.data.text;
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }

  /**
   * Parse receipt text to extract transaction details
   * @param {string} text - Raw OCR text
   * @returns {Promise<Object>} Parsed transaction data
   */
  static async parseReceipt(text) {
    try {
      console.log('Parsing receipt text...');
      
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Initialize result object
      const result = {
        amount: null,
        date: null,
        category: null,
        description: null,
        confidence: 'low'
      };

      // Extract amount (look for currency patterns)
      const amountPatterns = [
        /total[\s:]*\$?(\d+\.?\d*)/i,
        /amount[\s:]*\$?(\d+\.?\d*)/i,
        /due[\s:]*\$?(\d+\.?\d*)/i,
        /\$(\d+\.?\d*)/g,
        /(\d+\.?\d*)[\s]*total/i
      ];

      for (const pattern of amountPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          const amount = parseFloat(matches[1] || matches[0]);
          if (amount > 0 && amount < 10000) { // Reasonable amount range
            result.amount = amount;
            result.confidence = 'medium';
            break;
          }
        }
      }

      // Extract date (look for date patterns)
      const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
        /(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i
      ];

      for (const pattern of datePatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          try {
            const dateStr = matches[0];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              result.date = date.toISOString().split('T')[0];
              break;
            }
          } catch (error) {
            // Continue to next pattern
          }
        }
      }

      // Extract description (look for store names or items)
      const storePatterns = [
        /(walmart|target|amazon|costco|safeway|kroger|whole foods|trader joe's)/i,
        /(mcdonald's|burger king|kfc|subway|pizza hut|domino's)/i,
        /(shell|exxon|bp|chevron|mobil)/i,
        /(starbucks|dunkin'?|peet's|caribou)/i
      ];

      for (const pattern of storePatterns) {
        const match = text.match(pattern);
        if (match) {
          result.description = match[1];
          result.confidence = 'high';
          break;
        }
      }

      // If no store name found, try to extract from first few lines
      if (!result.description) {
        const firstLines = lines.slice(0, 3);
        for (const line of firstLines) {
          if (line.length > 3 && line.length < 50 && !line.match(/^\d/)) {
            result.description = line;
            break;
          }
        }
      }

      // Categorize based on keywords
      result.category = this.categorizeReceipt(text, result.description);

      console.log('Receipt parsing completed:', result);
      return result;
    } catch (error) {
      console.error('Receipt parsing failed:', error);
      throw new Error(`Failed to parse receipt: ${error.message}`);
    }
  }

  /**
   * Categorize receipt based on content
   * @param {string} text - Receipt text
   * @param {string} description - Extracted description
   * @returns {string} Category name
   */
  static categorizeReceipt(text, description) {
    const lowerText = text.toLowerCase();
    const lowerDesc = (description || '').toLowerCase();

    // Food & Dining
    if (lowerText.includes('restaurant') || lowerText.includes('cafe') || 
        lowerText.includes('food') || lowerText.includes('meal') ||
        lowerDesc.includes('mcdonald') || lowerDesc.includes('burger') ||
        lowerDesc.includes('pizza') || lowerDesc.includes('subway') ||
        lowerDesc.includes('starbucks') || lowerDesc.includes('dunkin')) {
      return 'Food & Dining';
    }

    // Grocery
    if (lowerText.includes('grocery') || lowerText.includes('supermarket') ||
        lowerDesc.includes('walmart') || lowerDesc.includes('target') ||
        lowerDesc.includes('safeway') || lowerDesc.includes('kroger') ||
        lowerDesc.includes('whole foods') || lowerDesc.includes('trader joe')) {
      return 'Food & Dining';
    }

    // Transportation
    if (lowerText.includes('gas') || lowerText.includes('fuel') ||
        lowerDesc.includes('shell') || lowerDesc.includes('exxon') ||
        lowerDesc.includes('bp') || lowerDesc.includes('chevron') ||
        lowerDesc.includes('mobil')) {
      return 'Transportation';
    }

    // Shopping
    if (lowerText.includes('clothing') || lowerText.includes('apparel') ||
        lowerText.includes('electronics') || lowerText.includes('home') ||
        lowerText.includes('department store')) {
      return 'Shopping';
    }

    // Entertainment
    if (lowerText.includes('movie') || lowerText.includes('theater') ||
        lowerText.includes('concert') || lowerText.includes('ticket') ||
        lowerText.includes('amusement')) {
      return 'Entertainment';
    }

    // Bills & Utilities
    if (lowerText.includes('electric') || lowerText.includes('water') ||
        lowerText.includes('gas bill') || lowerText.includes('internet') ||
        lowerText.includes('phone') || lowerText.includes('utility')) {
      return 'Bills & Utilities';
    }

    // Healthcare
    if (lowerText.includes('pharmacy') || lowerText.includes('drug') ||
        lowerText.includes('medical') || lowerText.includes('health') ||
        lowerText.includes('doctor') || lowerText.includes('hospital')) {
      return 'Healthcare';
    }

    // Default category
    return 'Other Expenses';
  }

  /**
   * Process receipt image and extract transaction data
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Object>} Extracted transaction data
   */
  static async processReceipt(imagePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
      }

      // Extract text from image
      const text = await this.extractText(imagePath);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the image');
      }

      // Parse the extracted text
      const transactionData = await this.parseReceipt(text);

      return {
        success: true,
        data: transactionData,
        rawText: text
      };
    } catch (error) {
      console.error('Receipt processing failed:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        rawText: null
      };
    }
  }

  /**
   * Validate image file
   * @param {string} filePath - Path to the file
   * @returns {boolean} True if valid image file
   */
  static isValidImageFile(filePath) {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'];
    const ext = path.extname(filePath).toLowerCase();
    return validExtensions.includes(ext);
  }

  /**
   * Get supported image formats
   * @returns {Array} Array of supported file extensions
   */
  static getSupportedFormats() {
    return ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'];
  }
}

module.exports = OCRService; 