import api from './api';

// This is a helper function to handle the API call logic and standardize the response.
const handleUpload = async (endpoint, file, type) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  try {
    const response = await api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    // On success, return the server's data with a `success: true` flag.
    return { ...response.data, success: true };
  } catch (error) {
    // On failure, return a clear error object with a `success: false` flag.
    return {
      success: false,
      error: error.response?.data?.message || 'An unknown upload error occurred.'
    };
  }
};

export const uploadService = {
  // `uploadReceipt` now uses the robust helper function.
  async uploadReceipt(file) {
    return handleUpload('/upload/receipt', file, 'receipt');
  },

  // `uploadStatement` also uses the helper function.
  async uploadStatement(file) {
    return handleUpload('/upload/statement', file, 'statement');
  },

  async getSupportedFormats() {
    try {
      const response = await api.get('/upload/supported-formats');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch supported formats:", error);
      // Return a default object so the UI doesn't crash if this call fails.
      return {
        receipt: { formats: ['JPG', 'PNG', 'TIFF'] },
        statement: { formats: ['PDF'] }
      };
    }
  },

  async getFiles() {
    try {
      const response = await api.get('/upload/files');
      return response.data.files;
    } catch (error) {
      console.error("Failed to fetch files:", error);
      return []; // Return an empty array on error.
    }
  },

  async deleteFile(filename) {
    try {
      const response = await api.delete(`/upload/${filename}`);
      return { ...response.data, success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete file.'
      };
    }
  }
};