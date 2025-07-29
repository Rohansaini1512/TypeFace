const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// This is a required helper function for the new pdf-parse options
// It tries to reconstruct the layout more accurately.
function render_page(pageData) {
    let render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
    }
    return pageData.getTextContent(render_options)
        .then(function(textContent) {
            let lastY, text = '';
            for (let item of textContent.items) {
                if (lastY == item.transform[5] || !lastY){
                    text += item.str;
                }  
                else{
                    text += '\n' + item.str;
                }    
                lastY = item.transform[5];
            }
            return text;
        });
}


class PDFService {
  static async extractText(pdfPath) {
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer, { pageRender: render_page });
      return data.text;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  static async parseTransactionStatement(text, userId) {
    const transactions = [];
    const lines = text.split('\n').map(line => line.trim());

    const startIndex = lines.findIndex(line => line.startsWith('BALANCE B/F'));
    if (startIndex === -1) {
      console.error("Could not find the start of transaction data ('BALANCE B/F').");
      return [];
    }

    const transactionLines = lines.slice(startIndex);
    
    const anchorRegex = /(\d{2}\/\d{2}\/\d{4})\s+(?:\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([\d,.]*)\s+([\d,.]*)\s+([\d,.]+\s*CR)/;

    let descriptionBuffer = [];

    for (const line of transactionLines) {
        const match = line.match(anchorRegex);

        if (match) {
            if (transactions.length > 0) {
                const lastTx = transactions[transactions.length - 1];
                lastTx.description = (lastTx.description + ' ' + descriptionBuffer.join(' ')).replace(/\s+/g, ' ').trim();
                lastTx.category = this.categorizeTransaction(lastTx.description, lastTx.type === 'expense');
            }
            descriptionBuffer = [];

            const [, dateStr, descPart, debitStr, creditStr] = match;
            
            const date = this.parseDate(dateStr);
            if (!date) continue;

            const debit = this.parseAmount(debitStr);
            const credit = this.parseAmount(creditStr);
            
            if (debit > 0 || credit > 0) {
                const isExpense = debit > 0;
                const amount = isExpense ? debit : credit;

                transactions.push({
                    user_id: userId,
                    amount: amount,
                    type: isExpense ? 'expense' : 'income',
                    category: 'Uncategorized',
                    description: descPart,
                    date: date,
                    receipt_url: null,
                });
            }
        } else if (transactions.length > 0) {
            if (line.length > 1 && !/^\d{2}\/\d{2}\/\d{4}/.test(line) && !/Page No:/.test(line)) {
               descriptionBuffer.push(line);
            }
        }
    }
    
    if (transactions.length > 0 && descriptionBuffer.length > 0) {
        const lastTx = transactions[transactions.length - 1];
        lastTx.description = (lastTx.description + ' ' + descriptionBuffer.join(' ')).replace(/\s+/g, ' ').trim();
        lastTx.category = this.categorizeTransaction(lastTx.description, lastTx.type === 'expense');
    }

    console.log(`State-machine parser successfully extracted ${transactions.length} transactions.`);
    return transactions;
  }

  static parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split(/\s+/)[0].split('/');
      if (parts.length !== 3) return null;
      const [day, month, year] = parts;
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }

  static parseAmount(amountStr) {
    if (!amountStr || amountStr.trim() === '') return 0;
    try {
      const cleanAmount = amountStr.replace(/[$,CR]/g, '').trim();
      const amount = parseFloat(cleanAmount);
      return isNaN(amount) ? 0 : amount;
    } catch (error) {
      return 0;
    }
  }

  static categorizeTransaction(description, isExpense) {
    const lowerDesc = description.toLowerCase();
    if (/salary|payroll/i.test(lowerDesc)) return 'Salary';
    if (/interest|credit\s*rfnd/i.test(lowerDesc)) return 'Investment';
    if (/restaurant|cafe|food|dhaba|milk/i.test(lowerDesc)) return 'Food & Dining';
    if (/grocery|supermarket/i.test(lowerDesc)) return 'Food & Dining';
    if (/gas|fuel|transport/i.test(lowerDesc)) return 'Transportation';
    if (/amazon|walmart|shopping|paytm|upi/i.test(lowerDesc)) return 'Shopping';
    if (/netflix|spotify|movie/i.test(lowerDesc)) return 'Entertainment';
    if (/utility|electric|internet/i.test(lowerDesc)) return 'Bills & Utilities';
    if (/pharmacy|medical/i.test(lowerDesc)) return 'Healthcare';
    if (/flight|hotel/i.test(lowerDesc)) return 'Travel';
    return isExpense ? 'Other Expenses' : 'Other Income';
  }

  static async processStatement(pdfPath, userId) {
    try {
      if (!fs.existsSync(pdfPath)) throw new Error('PDF file not found');
      
      // FIX: Call the static method on the class itself (PDFService) instead of `this`
      const text = await PDFService.extractText(pdfPath);
      
      if (!text || text.trim().length === 0) throw new Error('No text could be extracted from the PDF');
      
      // FIX: Call the static method on the class itself (PDFService) instead of `this`
      const transactions = await PDFService.parseTransactionStatement(text, userId);
      
      return {
        success: true,
        transactions: transactions,
        count: transactions.length,
        rawText: text.substring(0, 1500) + '...'
      };
    } catch (error) {
      console.error('PDF statement processing failed:', error);
      return { success: false, error: error.message, transactions: [], count: 0, rawText: null };
    }
  }

  static isValidPDFFile(filePath) {
    return path.extname(filePath).toLowerCase() === '.pdf';
  }

  static getSupportedFormats() {
    return ['.pdf'];
  }
}

module.exports = PDFService;