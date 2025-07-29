import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService.js';
import api from '../services/api.js'; // Import api to set token on it

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // The API interceptor already sets the header, but good practice.
          const userData = await authService.getProfile();
          setUser(userData);
        } catch (error) {
          // This catch block is fine, token is likely invalid/expired.
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      return { success: true, user: data.user };
    } catch (error) {
      // Propagate the actual error message from the backend
      const errorMessage = error.response?.data?.message || 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const register = async (username, email, password) => {
    try {
      const data = await authService.register(username, email, password);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      return { success: true, user: data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    // It's also good practice to clear the authorization header from the api instance
    delete api.defaults.headers.common['Authorization'];
    // Redirect logic should be handled in the component calling logout
  };

  const updateProfile = async (updates) => {
    try {
      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  };
  
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const data = await authService.changePassword(currentPassword, newPassword);
      return { success: true, message: data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      return { success: false, error: errorMessage };
    }
  };

  const deleteAccount = async () => {
    try {
      const data = await authService.deleteAccount();
      logout(); // Call logout to clear state and token
      return { success: true, message: data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Account deletion failed';
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};