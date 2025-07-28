const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please log in again' 
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: 'An error occurred during authentication' 
    });
  }
};


const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};


const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      username: user.username 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};


const hasPermission = (resourceUserId, currentUserId) => {
  return resourceUserId.toString() === currentUserId.toString();
};


const requireOwnership = (resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({ 
          error: 'Resource ID required',
          message: 'Resource ID is missing from request' 
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ 
        error: 'Permission check failed',
        message: 'An error occurred while checking permissions' 
      });
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  hasPermission,
  requireOwnership
}; 