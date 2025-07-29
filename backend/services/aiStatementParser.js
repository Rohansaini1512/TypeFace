const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the AI model with your API key from the .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

class AIStatementParserService {
 
  static async parseWithAI(text, userId) {
    const prompt = `
      You are an expert financial data extraction tool. Your task is to analyze the following bank statement text and extract every transaction.

      Here is the text:
      ---
      ${text}
      ---

      Based on the text provided, extract all financial transactions. For each transaction, provide the following details in a structured JSON format:
      - date: The date of the transaction in "YYYY-MM-DD" format.
      - description: A clean, single-line description of the transaction.
      - amount: The transaction amount as a number.
      - type: Either "expense" (for debits/withdrawals) or "income" (for credits/deposits).

      RULES:
      1. Only include actual transactions. Ignore balance forwards, summaries, page numbers, or any non-transactional lines.
      2. The final output MUST be a valid JSON array of objects.
      3. If you cannot find any valid transactions, return an empty array: [].

      Example of the required JSON output format:
      [
        {
          "date": "2025-07-21",
          "description": "THRU UPI DEBIT UPI/386877898953/ NA XXXXX /paytmqrmdt8blumxh @paytm YESBOPTMUPI/LAA IL MARWARI DHABA",
          "amount": 1500.00,
          "type": "expense"
        },
        {
          "date": "2025-07-21",
          "description": "BY UPI CREDIT UPI/520299334393/ UPI XXXXX75859/unknownxd9909 1@okicici UCBA0001500/AMA R SINGH",
          "amount": 1500.00,
          "type": "income"
        }
      ]
    `;

    try {
      console.log("Sending statement text to Gemini for parsing...");
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Clean the response from the AI, which might be wrapped in markdown
      const cleanedJsonString = responseText.replace(/^```json\s*|```\s*$/g, '');
      
      console.log("Received and cleaned response from AI.");
      
      const parsedTransactions = JSON.parse(cleanedJsonString);

      // Add the userId and categorize each transaction
      return parsedTransactions.map(tx => ({
        userId: userId,
        amount: tx.amount,
        type: tx.type,
        category: this.categorizeTransaction(tx.description, tx.type === 'expense'),
        description: tx.description,
        date: new Date(tx.date),
        receiptUrl: null
      }));

    } catch (error) {
      console.error("Error parsing statement with AI:", error);
      throw new Error("The AI model could not process the statement. The document might be in an unsupported format or corrupted.");
    }
  }

  /**
   * Assigns a category to a transaction based on its description.
   * @param {string} description - The transaction description.
   * @param {boolean} isExpense - Whether the transaction is an expense.
   * @returns {string} The determined category name.
   */
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
}

module.exports = AIStatementParserService;