import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, FileText, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadService } from '../services/uploadService.js';
import toast from 'react-hot-toast';

const Upload = () => {
  const [uploadType, setUploadType] = useState('receipt');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [supportedFormats, setSupportedFormats] = useState({});

  useEffect(() => {
    loadSupportedFormats();
  }, []);

  const loadSupportedFormats = async () => {
    try {
      const formats = await uploadService.getSupportedFormats();
      setSupportedFormats(formats);
    } catch (error) {
      console.error('Error loading supported formats:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      let result;
      if (uploadType === 'receipt') {
        result = await uploadService.uploadReceipt(selectedFile);
      } else {
        result = await uploadService.uploadStatement(selectedFile);
      }

      setUploadResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (!file) return <UploadIcon className="h-12 w-12 text-gray-400" />;
    
    const extension = file.name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif'].includes(extension)) {
      return <Image className="h-12 w-12 text-blue-500" />;
    } else if (extension === 'pdf') {
      return <FileText className="h-12 w-12 text-red-500" />;
    }
    return <UploadIcon className="h-12 w-12 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Files</h1>
        <p className="text-gray-600">
          Upload receipts for OCR processing or PDF statements for bulk import
        </p>
      </div>

      {/* Upload Type Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Select Upload Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setUploadType('receipt')}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              uploadType === 'receipt'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Image className="h-8 w-8 text-blue-500" />
              <div>
                <h4 className="font-medium">Receipt Upload</h4>
                <p className="text-sm text-gray-600">
                  Upload receipt images for automatic text extraction
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setUploadType('statement')}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              uploadType === 'statement'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-red-500" />
              <div>
                <h4 className="font-medium">Statement Upload</h4>
                <p className="text-sm text-gray-600">
                  Upload PDF bank statements for bulk transaction import
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">
          {uploadType === 'receipt' ? 'Upload Receipt Image' : 'Upload PDF Statement'}
        </h3>

        <div
          className="file-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept={uploadType === 'receipt' ? 'image/*' : '.pdf'}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="text-center">
              {getFileIcon(selectedFile)}
              <h4 className="mt-2 font-medium text-gray-900">{selectedFile.name}</h4>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              <p className="text-xs text-gray-400 mt-1">Click to change file</p>
            </div>
          ) : (
            <div className="text-center">
              {getFileIcon()}
              <h4 className="mt-2 font-medium text-gray-900">
                {uploadType === 'receipt' ? 'Upload receipt image' : 'Upload PDF statement'}
              </h4>
              <p className="text-sm text-gray-500">
                Drag and drop or click to select file
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {uploadType === 'receipt' 
                  ? `Supported formats: ${supportedFormats.receipt?.formats?.join(', ') || 'JPG, PNG, BMP, TIFF'}`
                  : 'Supported format: PDF'
                }
              </p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="btn btn-primary"
            >
              {isUploading ? (
                <>
                  <div className="spinner"></div>
                  Processing...
                </>
              ) : (
                <>
                  <UploadIcon size={18} />
                  {uploadType === 'receipt' ? 'Process Receipt' : 'Process Statement'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Processing Result</h3>
          
          {uploadResult.success ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Processing completed successfully!</span>
              </div>

              {uploadType === 'receipt' && uploadResult.extractedData && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Extracted Data:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Amount:</span>{' '}
                      {uploadResult.extractedData.amount 
                        ? `$${uploadResult.extractedData.amount.toFixed(2)}`
                        : 'Not detected'
                      }
                    </div>
                    <div>
                      <span className="font-medium">Category:</span>{' '}
                      {uploadResult.extractedData.category || 'Not detected'}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>{' '}
                      {uploadResult.extractedData.date || 'Not detected'}
                    </div>
                    <div>
                      <span className="font-medium">Description:</span>{' '}
                      {uploadResult.extractedData.description || 'Not detected'}
                    </div>
                    <div>
                      <span className="font-medium">Confidence:</span>{' '}
                      <span className={`capitalize ${
                        uploadResult.extractedData.confidence === 'high' ? 'text-green-600' :
                        uploadResult.extractedData.confidence === 'medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {uploadResult.extractedData.confidence}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {uploadType === 'statement' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Import Summary:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Transactions:</span>{' '}
                      {uploadResult.totalTransactions}
                    </div>
                    <div>
                      <span className="font-medium">Successfully Imported:</span>{' '}
                      {uploadResult.insertedTransactions}
                    </div>
                    <div>
                      <span className="font-medium">Skipped:</span>{' '}
                      {uploadResult.skippedTransactions}
                    </div>
                  </div>
                </div>
              )}

              {uploadResult.transaction && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Transaction Created:</h4>
                  <div className="text-sm text-green-700">
                    <p><span className="font-medium">Amount:</span> ${uploadResult.transaction.amount}</p>
                    <p><span className="font-medium">Category:</span> {uploadResult.transaction.category}</p>
                    <p><span className="font-medium">Description:</span> {uploadResult.transaction.description}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Processing failed: {uploadResult.error}</span>
            </div>
          )}

          {uploadResult.rawText && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                View extracted text (for debugging)
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                {uploadResult.rawText}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Instructions</h3>
        
        {uploadType === 'receipt' ? (
          <div className="space-y-3 text-sm text-gray-600">
            <p>• Upload clear, well-lit images of receipts</p>
            <p>• Supported formats: JPG, PNG, BMP, TIFF</p>
            <p>• Maximum file size: 10MB</p>
            <p>• The system will automatically extract amount, date, and category</p>
            <p>• You can review and edit the extracted data before saving</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-600">
            <p>• Upload PDF bank statements or transaction histories</p>
            <p>• The system will parse the document and extract transaction data</p>
            <p>• Maximum file size: 10MB</p>
            <p>• Transactions will be automatically categorized based on descriptions</p>
            <p>• Review imported transactions in the Transactions page</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload; 