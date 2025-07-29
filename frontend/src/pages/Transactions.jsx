import React, { useState, useEffect, useCallback } from 'react';
import { transactionService } from '../services/transactionService';
import toast from 'react-hot-toast';
import { Plus, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import Pagination from '../components/Pagination'; // 1. Import the new component

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 2. Add state for pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0,
  });

  // Filters can be expanded upon later
  const [filters, setFilters] = useState({}); 

  // 3. Use useCallback to create a memoized function for loading data
  const loadTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const query = { ...filters, page, limit: pagination.limit };
      const data = await transactionService.getTransactions(query);
      
      setTransactions(data.transactions || []);
      setPagination(data.pagination || { page: 1, totalPages: 1 }); // Update pagination state
      
    } catch (error) {
      toast.error("Failed to load transactions.");
      console.error("Load transactions error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]); // Dependencies for useCallback

  // 4. Load transactions when the component mounts or the page changes
  useEffect(() => {
    loadTransactions(pagination.page);
  }, [loadTransactions, pagination.page]);

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

  return (
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
          <Link to="/transactions/new" className="btn btn-primary">
            <Plus size={18} />
            <span>Add Transaction</span>
          </Link>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{tx.description}</td>
                    <td className="px-6 py-4">{tx.category}</td>
                    <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className={`px-6 py-4 text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-gray-500">
                    <p>No transactions found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* 5. Render the pagination component */}
        {!loading && pagination.total > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};

export default Transactions;