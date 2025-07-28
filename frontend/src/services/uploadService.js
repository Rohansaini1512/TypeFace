import api from './api';

export const uploadService = {
  async uploadReceipt(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'receipt');
    
    const response = await api.post('/upload/receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadStatement(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'statement');
    
    const response = await api.post('/upload/statement', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getSupportedFormats() {
    const response = await api.get('/upload/supported-formats');
    return response.data;
  },

  async getFiles() {
    const response = await api.get('/upload/files');
    return response.data.files;
  },

  async deleteFile(filename) {
    const response = await api.delete(`/upload/${filename}`);
    return response.data;
  }
}; 