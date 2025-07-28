import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Plus, 
  Edit, 
  Trash2
} from 'lucide-react';
import { transactionService } from '../services/transactionService.js';
import toast from 'react-hot-toast';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getTransactions(filters);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      if (editingTransaction) {
        await transactionService.updateTransaction(editingTransaction.id, data);
        toast.success('Transaction updated successfully');
      } else {
        await transactionService.createTransaction(data);
        toast.success('Transaction created successfully');
      }
      reset();
      setShowForm(false);
      setEditingTransaction(null);
      loadTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Failed to save transaction');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    reset(transaction);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionService.deleteTransaction(id);
        toast.success('Transaction deleted successfully');
        loadTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        toast.error('Failed to delete transaction');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </button>
      </div>

      {/* Transaction Form */}
      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingTransaction(null);
                reset();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('amount', { required: 'Amount is required' })}
                  className={`form-input ${errors.amount ? 'error' : ''}`}
                />
                {errors.amount && (
                  <p className="form-error">{errors.amount.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Type</label>
                <select
                  {...register('type', { required: 'Type is required' })}
                  className={`form-select ${errors.type ? 'error' : ''}`}
                >
                  <option value="">Select Type</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                {errors.type && (
                  <p className="form-error">{errors.type.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Category</label>
                <input
                  type="text"
                  {...register('category', { required: 'Category is required' })}
                  className={`form-input ${errors.category ? 'error' : ''}`}
                />
                {errors.category && (
                  <p className="form-error">{errors.category.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                  className={`form-input ${errors.date ? 'error' : ''}`}
                />
                {errors.date && (
                  <p className="form-error">{errors.date.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea
                {...register('description')}
                rows="3"
                className="form-input"
                placeholder="Optional description..."
              />
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary">
                {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTransaction(null);
                  reset();
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Transaction History</h2>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>{transaction.description || '-'}</td>
                    <td>{transaction.category}</td>
                    <td>
                      <span
                        className={`badge ${
                          transaction.type === 'income'
                            ? 'badge-success'
                            : 'badge-danger'
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No transactions found. Add your first transaction to get started.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions; 