const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// FIX: Add a check to ensure the API key is present before initializing.
if (!process.env.GEMINI_API_KEY) {
  throw new Error("CRITICAL: GEMINI_API_KEY is not defined in your .env file. The AI services cannot start.");
}

// Initialize the AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

class AIReceiptParserService {
  static fileToGenerativePart(filePath) {
    const mimeType = this.getMimeType(filePath);
    return {
      inlineData: {
        data: fs.readFileSync(filePath).toString("base64"),
        mimeType
      },
    };
  }

  static getMimeType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    switch (extension) {
      case '.jpg': case '.jpeg': return 'image/jpeg';
      case '.png': return 'image/png';
      case '.webp': return 'image/webp';
      default: return 'application/octet-stream';
    }
  }

  static async parseWithAI(imagePath) {
    const prompt = `
      You are an expert financial data extraction tool specializing in reading receipts.
      Analyze the provided receipt image and extract the following information:
      1.  **totalAmount**: The final total amount paid.
      2.  **transactionDate**: The date of the transaction, in "YYYY-MM-DD" format.
      3.  **description**: A short, suitable description, typically the name of the store or merchant.
      RULES:
      - Provide ONLY a valid JSON object as the output.
      - If a value cannot be determined, set it to null.
      Example: { "totalAmount": 15.75, "transactionDate": "2025-07-28", "description": "Walmart" }
    `;

    try {
      console.log("Sending receipt image to Gemini for parsing...");
      const imagePart = this.fileToGenerativePart(imagePath);
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const responseText = response.text();
      
      const cleanedJson = responseText.replace(/^```json\s*|```\s*$/g, '');
      const parsedData = JSON.parse(cleanedJson);
      return { success: true, data: parsedData };

    } catch (error) {
      console.error("Error parsing receipt with AI:", error);
      throw new Error("The AI model could not process the receipt image.");
    }
  }
}

module.exports = AIReceiptParserService;