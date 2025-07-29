import React, { useState, useEffect, useCallback } from 'react';
import { transactionService } from '../services/transactionService';
import toast from 'react-hot-toast';
import { Plus, Filter, X, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';
import { useForm } from 'react-hook-form';

const Transactions = ({ isNew = false }) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(isNew);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  // Form handling
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      type: 'expense',
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0]
    }
  });

  const transactionType = watch('type');

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0,
  });

  // Filter state
  const [filters, setFilters] = useState({});

  // Fetch both transactions and categories
  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const query = { ...filters, page, limit: pagination.limit };
      const [transactionsData, categoriesData] = await Promise.all([
        transactionService.getTransactions(query),
        transactionService.getCategories()
      ]);
      
      setTransactions(transactionsData.transactions || []);
      setPagination(transactionsData.pagination || { page: 1, totalPages: 1 });
      setCategories(categoriesData || []);
      
    } catch (error) {
      toast.error("Failed to load data.");
      console.error("Load data error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    loadData(pagination.page);
  }, [loadData, pagination.page]);

  // Form submission handler
  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const transactionData = {
        ...data,
        amount: parseFloat(data.amount),
      };
      
      if (editingTransaction) {
        await transactionService.updateTransaction(editingTransaction.id, transactionData);
        toast.success('Transaction updated successfully');
      } else {
        await transactionService.createTransaction(transactionData);
        toast.success('Transaction added successfully');
      }
      
      closeFormModal();
      loadData(pagination.page);
      
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(error.response?.data?.message || 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Open the modal for editing
  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    reset({
      ...transaction,
      date: new Date(transaction.date).toISOString().split('T')[0]
    });
    setShowFormModal(true);
  };
  
  // Open the modal for adding
  const handleAdd = () => {
    setEditingTransaction(null);
    reset({
      type: 'expense',
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowFormModal(true);
  };

  // Close the modal and reset state
  const closeFormModal = () => {
    reset();
    setShowFormModal(false);
    setEditingTransaction(null);
    if (isNew) {
      navigate('/transactions');
    }
  };
  
  // Handle deletion with confirmation
  const handleDelete = async (id) => {
    try {
      await transactionService.deleteTransaction(id);
      toast.success('Transaction deleted');
      setTransactionToDelete(null); // Close confirmation
      loadData(pagination.page);
    } catch (error) {
      toast.error('Failed to delete transaction.');
    }
  };
  
  const handlePageChange = (newPage) => {
    if (newPage !== pagination.page) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const filteredCategories = categories.filter(c => c.type === transactionType);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600">View and manage all your transactions.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="btn btn-outline">
              <Filter size={18} />
              <span>Filter</span>
            </button>
            <button onClick={handleAdd} className="btn btn-primary">
              <Plus size={18} />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Description</th>
                  <th scope="col" className="px-6 py-3">Category</th>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3 text-right">Amount</th>
                  <th scope="col" className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{tx.description}</td>
                      <td className="px-6 py-4">{tx.category}</td>
                      <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className={`px-6 py-4 text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button onClick={() => handleEdit(tx)} className="p-1 text-gray-500 hover:text-blue-600">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => setTransactionToDelete(tx)} className="p-1 text-gray-500 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-gray-500">
                      <p>No transactions found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {!loading && pagination.total > 0 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all duration-300">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h2>
                <button onClick={closeFormModal} className="p-1 rounded-full hover:bg-gray-200">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Type</label>
                    <div className="flex space-x-4 p-1 bg-gray-100 rounded-lg">
                      <label className={`flex-1 text-center py-2 rounded-md cursor-pointer ${transactionType === 'expense' ? 'bg-white shadow' : ''}`}>
                        <input type="radio" value="expense" {...register('type')} className="sr-only" />
                        Expense
                      </label>
                      <label className={`flex-1 text-center py-2 rounded-md cursor-pointer ${transactionType === 'income' ? 'bg-white shadow' : ''}`}>
                        <input type="radio" value="income" {...register('type')} className="sr-only" />
                        Income
                      </label>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="amount" className="form-label">Amount</label>
                    <input
                      id="amount" type="number" step="0.01" placeholder="0.00"
                      {...register('amount', { required: 'Amount is required', valueAsNumber: true, min: { value: 0.01, message: 'Amount must be positive' } })}
                      className={`form-input ${errors.amount ? 'error' : ''}`}
                    />
                    {errors.amount && <p className="form-error">{errors.amount.message}</p>}
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="form-label">Description</label>
                  <input
                    id="description" type="text" placeholder="e.g., Lunch with colleagues"
                    {...register('description', { required: 'Description is required' })}
                    className={`form-input ${errors.description ? 'error' : ''}`}
                  />
                  {errors.description && <p className="form-error">{errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="form-label">Category</label>
                    <select id="category" {...register('category', { required: 'Category is required' })} className={`form-select ${errors.category ? 'error' : ''}`}>
                      <option value="">Select a category...</option>
                      {filteredCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    {errors.category && <p className="form-error">{errors.category.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="date" className="form-label">Date</label>
                    <input
                      id="date" type="date"
                      {...register('date', { required: 'Date is required' })}
                      className={`form-input ${errors.date ? 'error' : ''}`}
                    />
                    {errors.date && <p className="form-error">{errors.date.message}</p>}
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={closeFormModal} className="btn btn-outline" disabled={submitting}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {transactionToDelete && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold">Confirm Deletion</h3>
                <p className="text-sm text-gray-600 mt-2">
                    Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setTransactionToDelete(null)} className="btn btn-outline">Cancel</button>
                    <button onClick={() => handleDelete(transactionToDelete.id)} className="btn btn-danger">Delete</button>
                </div>
            </div>
         </div>
      )}
    </>
  );
};

export default Transactions;